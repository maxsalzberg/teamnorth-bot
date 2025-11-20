import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = [];

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(commandsPath, file);
  const fileUrl = pathToFileURL(filePath).href;
  const { default: command } = await import(fileUrl);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`Command ${file} is missing required 'data' and 'execute' properties`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Starting registration of ${commands.length} commands...`);

    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`Successfully registered ${commands.length} commands for guild ${guildId}`);
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`Successfully registered ${commands.length} global commands`);
    }
  } catch (error) {
    if (error.code === 50001) {
      console.error('Missing Access error:');
      console.error('1. Make sure the bot is invited to the server');
      console.error('2. Check that the invite URL includes "applications.commands" scope');
      console.error('3. Verify GUILD_ID and CLIENT_ID are correct in .env');
      console.error('4. Try deploying globally by removing GUILD_ID from .env');
    } else {
      console.error('Error registering commands:', error);
    }
  }
})();

