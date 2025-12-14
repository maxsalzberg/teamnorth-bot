import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Проверка работоспособности бота и задержки'),
  async execute(interaction) {
    const sent = await interaction.reply({ 
      content: 'Проверка задержки...', 
      fetchReply: true 
    });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;
    const websocket = wsPing >= 0 ? `${Math.round(wsPing)}ms` : 'измеряется...';
    
    await interaction.editReply(
      `🏓 Pong!\n` +
      `📡 Задержка API: **${roundtrip}ms**\n` +
      `💓 WebSocket: **${websocket}**`
    );
  },
};

