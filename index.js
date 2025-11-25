import { Client, GatewayIntentBits, Events } from 'discord.js';
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

client.once(Events.ClientReady, (c) => {
  console.log(`Bot ready! Logged in as ${c.user.tag}`);
});

client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('DISCORD_TOKEN not found in .env file!');
  process.exit(1);
}

client.login(token);

