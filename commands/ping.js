import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot latency and API response time'),
  
  async execute(interaction) {
    const startTime = Date.now();
    
    try {
      await interaction.deferReply();
      
      const endTime = Date.now();
      const roundtripLatency = endTime - startTime;
      const apiLatency = Math.round(interaction.client.ws.ping);
      
      const embed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .addFields(
          { 
            name: '⏱️ Roundtrip Latency', 
            value: `${roundtripLatency}ms`, 
            inline: true 
          },
          { 
            name: '🌐 API Latency', 
            value: `${apiLatency}ms`, 
            inline: true 
          }
        )
        .setColor(apiLatency < 100 ? Colors.Green : apiLatency < 200 ? Colors.Yellow : Colors.Red)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in ping command:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ 
            content: 'An error occurred while executing ping command!', 
            ephemeral: true 
          });
        } catch (replyError) {
          console.error('Failed to reply to interaction:', replyError);
        }
      } else {
        try {
          await interaction.editReply({ 
            content: 'An error occurred while executing ping command!' 
          });
        } catch (editError) {
          console.error('Failed to edit reply:', editError);
        }
      }
    }
  },
};

