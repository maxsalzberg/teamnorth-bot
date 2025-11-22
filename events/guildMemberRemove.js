import { Events, EmbedBuilder, Colors } from 'discord.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    
    if (!logChannelId) {
      console.log('LOG_CHANNEL_ID not set, skipping member leave log');
      return;
    }
    
    try {
      const logChannel = await member.guild.channels.fetch(logChannelId);
      
      if (!logChannel) {
        console.error(`Log channel with ID ${logChannelId} not found`);
        return;
      }
      
      if (!logChannel.isTextBased()) {
        console.error(`Channel ${logChannelId} is not a text channel`);
        return;
      }
      
      const joinedAt = member.joinedAt;
      const joinedDate = joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>` : 'Unknown';
      
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: member.user.tag, 
          iconURL: member.user.displayAvatarURL() 
        })
        .setDescription(`**User left** ${member.user}\n\n**Joined:** ${joinedDate}`)
        .setColor(0x5DADE2)
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setTimestamp()
        .setFooter({ text: `User ID: ${member.user.id}` });
      
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error in guildMemberRemove event:', error);
    }
  },
};

