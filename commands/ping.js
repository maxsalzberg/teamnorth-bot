import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks bot latency'),
  
  async execute(interaction) {
    const startTime = Date.now();
    
    try {
      await interaction.reply({ content: 'Pong!' });
      const endTime = Date.now();
      const timeDiff = endTime - startTime;
      
      await interaction.editReply(
        `Pong!\n` +
        `Latency: ${timeDiff}ms\n` +
        `API Latency: ${Math.round(interaction.client.ws.ping)}ms`
      );
    } catch (error) {
      console.error('Error in ping command:', error);
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({ 
            content: 'An error occurred while executing ping command!', 
            flags: MessageFlags.Ephemeral 
          });
        } catch (replyError) {
          console.error('Failed to reply to interaction:', replyError);
        }
      }
    }
  },
};

