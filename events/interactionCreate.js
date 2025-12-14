import { Events } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsPath = join(__dirname, '..', 'commands');

// Кэш команд для быстрого доступа
const commandsCache = new Map();

// Загружаем команды при инициализации
async function loadCommands() {
  try {
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const fileUrl = pathToFileURL(filePath).href;
      const { default: command } = await import(fileUrl);
      
      if (command.data) {
        commandsCache.set(command.data.name, command);
        console.log(`[Commands] Loaded: ${command.data.name}`);
      }
    }
  } catch (error) {
    console.error('[Commands] Error loading commands:', error);
  }
}

// Загружаем команды сразу
loadCommands();

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commandsCache.get(interaction.commandName);
    
    if (!command) {
      console.error(`Command ${interaction.commandName} not found`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const errorMessage = { 
        content: 'Произошла ошибка при выполнении команды!', 
        ephemeral: true 
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },
};

