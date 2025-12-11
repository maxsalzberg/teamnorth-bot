import { Events } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

const ROLE_ID = process.env.TRACKED_ROLE_ID;
const NOTIFY_CHANNEL_ID = process.env.ROLE_NOTIFY_CHANNEL_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const STORAGE_PATH = join(DATA_DIR, 'roleReminders.json');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const timers = new Map();

async function readStoredReminders() {
  try {
    const raw = await readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error('[roleReminder] Failed to read storage:', error);
    return {};
  }
}

async function writeStoredReminders(data) {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(STORAGE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('[roleReminder] Failed to write storage:', error);
  }
}

async function sendReminder(client, userId, guildId, assignedAt) {
  const channelId = NOTIFY_CHANNEL_ID;
  if (!channelId) {
    console.warn('[roleReminder] ROLE_NOTIFY_CHANNEL_ID is not set; skipping reminder send');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      console.error(`[roleReminder] Channel ${channelId} is not text-based or not found`);
      return;
    }

    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) {
      console.warn(`[roleReminder] Guild ${guildId} not found; reminder skipped for user ${userId}`);
      await channel.send(`❌ Ошибка: Гильдия не найдена для напоминания о роли. User ID: ${userId}`);
      await clearReminder(userId);
      return;
    }

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      console.warn(`[roleReminder] User ${userId} not found in guild ${guildId}; sending error message`);
      const assignedDate = new Date(assignedAt);
      const assignedTimestamp = Math.floor(assignedDate.getTime() / 1000);
      const roleMention = `<@&${ROLE_ID}>`;
      await channel.send(
        `Ошибка: Пользователь не найден или вышел. Прошло 7 дней с момента выдачи роли ${roleMention} (User ID: ${userId}, выдана: <t:${assignedTimestamp}:F>)`
      );
      await clearReminder(userId);
      return;
    }

    if (!member.roles.cache.has(ROLE_ID)) {
      console.log(`[roleReminder] User ${userId} no longer has role ${ROLE_ID}; clearing reminder`);
      await clearReminder(userId);
      return;
    }

    const assignedDate = new Date(assignedAt);
    const assignedTimestamp = Math.floor(assignedDate.getTime() / 1000);
    const roleMention = `<@&${ROLE_ID}>`;
    const userMention = `<@${userId}>`;

    await channel.send(
      `Прошло 7 дней с момента выдачи роли ${roleMention} игроку ${userMention}. (выдана: <t:${assignedTimestamp}:F>)`
    );
    await clearReminder(userId);
    console.log(`[roleReminder] Reminder sent for user ${userId}`);
  } catch (error) {
    console.error('[roleReminder] Failed to send reminder:', error);
  }
}

async function scheduleReminder(client, userId, guildId, assignedAt) {
  const delay = Math.max(0, assignedAt + SEVEN_DAYS_MS - Date.now());

  if (timers.has(userId)) {
    clearTimeout(timers.get(userId));
  }

  const timer = setTimeout(() => {
    timers.delete(userId);
    sendReminder(client, userId, guildId, assignedAt);
  }, delay);

  timers.set(userId, timer);
}

async function clearReminder(userId) {
  if (timers.has(userId)) {
    clearTimeout(timers.get(userId));
    timers.delete(userId);
  }

  const data = await readStoredReminders();
  if (data[userId]) {
    delete data[userId];
    await writeStoredReminders(data);
  }
}

async function storeReminder(userId, guildId, assignedAt) {
  const data = await readStoredReminders();
  data[userId] = { guildId, assignedAt };
  await writeStoredReminders(data);
}

async function handleRoleAdd(client, member) {
  if (!ROLE_ID) {
    console.warn('[roleReminder] TRACKED_ROLE_ID is not set; skipping');
    return;
  }

  const assignedAt = Date.now();
  await storeReminder(member.id, member.guild.id, assignedAt);
  await scheduleReminder(client, member.id, member.guild.id, assignedAt);
  console.log(`[roleReminder] Reminder scheduled for user ${member.id} in guild ${member.guild.id}`);
}

async function restoreReminders(client) {
  const data = await readStoredReminders();
  const entries = Object.entries(data);

  for (const [userId, payload] of entries) {
    const { guildId, assignedAt } = payload;
    if (!guildId || !assignedAt) {
      delete data[userId];
      continue;
    }
    await scheduleReminder(client, userId, guildId, assignedAt);
  }

  await writeStoredReminders(data);
  console.log(`[roleReminder] Restored ${entries.length} reminders from storage`);
}

function hasRoleChangeAdded(oldMember, newMember) {
  if (!ROLE_ID) return false;
  const hadRole = oldMember.roles.cache.has(ROLE_ID);
  const hasRole = newMember.roles.cache.has(ROLE_ID);
  return !hadRole && hasRole;
}

function hasRoleRemoved(oldMember, newMember) {
  if (!ROLE_ID) return false;
  const hadRole = oldMember.roles.cache.has(ROLE_ID);
  const hasRole = newMember.roles.cache.has(ROLE_ID);
  return hadRole && !hasRole;
}

async function handleMemberUpdate(oldMember, newMember) {
  if (hasRoleChangeAdded(oldMember, newMember)) {
    await handleRoleAdd(newMember.client, newMember);
    return;
  }

  if (hasRoleRemoved(oldMember, newMember)) {
    await clearReminder(newMember.id);
    console.log(`[roleReminder] Reminder cleared for user ${newMember.id} due to role removal`);
  }
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    if (!ROLE_ID) {
      console.warn('[roleReminder] TRACKED_ROLE_ID is not configured; feature disabled');
      return;
    }

    if (!NOTIFY_CHANNEL_ID) {
      console.warn('[roleReminder] ROLE_NOTIFY_CHANNEL_ID is not configured; feature disabled');
      return;
    }

    console.log('[roleReminder] Initializing role reminder handlers');

    await restoreReminders(client);

    client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
      handleMemberUpdate(oldMember, newMember).catch(error => {
        console.error('[roleReminder] Error handling member update:', error);
      });
    });
  },
};

