import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot latency'),
  
  async execute(interaction) {
    const { message } = await interaction.reply({ content: 'Pong!', withResponse: true });
    const timeDiff = message.createdTimestamp - interaction.createdTimestamp;
    
    await interaction.editReply(
      `Pong!\n` +
      `Latency: ${timeDiff}ms\n` +
      `API Latency: ${Math.round(interaction.client.ws.ping)}ms`
    );
  },
};

