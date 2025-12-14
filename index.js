import { Client, GatewayIntentBits, Events, ActivityType, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  presence: {
    status: 'online',
    activities: [{
      name: 'TeamNorth Bot',
      type: ActivityType.Playing,
    }],
  },
});

const eventsPath = join(__dirname, 'events');
try {
  const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  
  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const fileUrl = pathToFileURL(filePath).href;
    const { default: event } = await import(fileUrl);
    
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`Event loaded: ${event.name}`);
  }
} catch (error) {
  console.error('Error loading events:', error);
  process.exit(1);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot ready! Logged in as ${c.user.tag}`);
  console.log(`Bot ID: ${c.user.id}`);
  
  // Регистрация slash команд
  try {
    const commandsPath = join(__dirname, 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = [];
    
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      const { default: command } = await import(fileUrl);
      commands.push(command.data.toJSON());
    }
    
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    
    // Регистрируем команды для каждого сервера
    for (const guild of c.guilds.cache.values()) {
      try {
        const data = await rest.put(
          Routes.applicationGuildCommands(c.user.id, guild.id),
          { body: commands }
        );
        console.log(`✓ Successfully registered ${data.length} commands for ${guild.name}`);
      } catch (error) {
        console.error(`Failed to register commands for ${guild.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
  
  // Небольшая задержка перед установкой presence для стабильности
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Устанавливаем presence несколькими способами для надежности
  try {
    // Способ 1: через setPresence
    await c.user.setPresence({
      activities: [{
        name: 'TeamNorth Bot',
        type: ActivityType.Playing,
      }],
      status: 'online',
    });
    console.log('✓ Presence set via setPresence()');
    
    // Способ 2: через setStatus отдельно
    await c.user.setStatus('online');
    console.log('✓ Status set via setStatus()');
    
    // Способ 3: через setActivity отдельно
    await c.user.setActivity('TeamNorth Bot', { type: ActivityType.Playing });
    console.log('✓ Activity set via setActivity()');
    
    // Проверяем текущий статус через некоторое время
    setTimeout(() => {
      const currentPresence = c.user.presence;
      console.log(`Current presence status: ${currentPresence?.status || 'unknown'}`);
      console.log(`Current activities: ${currentPresence?.activities?.length || 0}`);
    }, 3000);
    
  } catch (error) {
    console.error('Failed to set presence:', error);
    console.error('Error details:', error.message);
  }
  
  console.log(`Connected to ${c.guilds.cache.size} server(s):`);
  c.guilds.cache.forEach(guild => {
    console.log(`  - ${guild.name} (ID: ${guild.id})`);
    const botMember = guild.members.cache.get(c.user.id);
    if (botMember) {
      console.log(`    ✓ Bot is member of this server`);
      console.log(`    Permissions: ${guild.members.me?.permissions.toArray().join(', ') || 'none'}`);
    }
  });
});

client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

client.on(Events.Warn, warning => {
  console.warn('Discord client warning:', warning);
});

client.on(Events.Debug, info => {
  if (info.includes('heartbeat') || info.includes('WebSocket')) {
    console.log('[DEBUG]', info);
  }
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN not found in .env file!');
  process.exit(1);
}

client.login(token);

