import { Client, GatewayIntentBits, Events, Collection, EmbedBuilder, MessageFlags } from 'discord.js';
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
});

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
try {
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const fileUrl = pathToFileURL(filePath).href;
    const { default: command } = await import(fileUrl);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      console.log(`Command loaded: ${command.data.name}`);
    } else {
      console.log(`Command ${file} is missing required 'data' and 'execute' properties`);
    }
  }
} catch (error) {
  console.log('Commands folder not found, create it to add commands');
}

client.once(Events.ClientReady, (c) => {
  console.log(`Bot ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`Command ${interaction.commandName} not found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
          content: 'An error occurred while executing the command!', 
          flags: MessageFlags.Ephemeral 
        });
      } else {
        await interaction.reply({ 
          content: 'An error occurred while executing the command!', 
          flags: MessageFlags.Ephemeral 
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

client.on(Events.GuildMemberRemove, async (member) => {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  
  if (!logChannelId) {
    console.log('LOG_CHANNEL_ID not set, skipping member leave log');
    return;
  }
  
  const logChannel = await member.guild.channels.fetch(logChannelId).catch(() => null);
  
  if (!logChannel) {
    console.error(`Log channel with ID ${logChannelId} not found`);
    return;
  }
  
  const joinedAt = member.joinedAt;
  const joinedDate = joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>` : 'Unknown';
  
  const embed = new EmbedBuilder()
    .setDescription(`User left ${member.user} (${member.user.tag})\nJoined: ${joinedDate}`)
    .setTimestamp();
  
  await logChannel.send({ embeds: [embed] });
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN not found in .env file!');
  process.exit(1);
}

client.login(token);

