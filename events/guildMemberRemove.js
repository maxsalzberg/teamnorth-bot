import { Events, EmbedBuilder } from 'discord.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
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
    
    let actionType = 'left';
    let actionText = 'User left';
    
    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 20
      });
      
      const kickLog = auditLogs.entries.first();
      if (kickLog && kickLog.target.id === member.user.id && Date.now() - kickLog.createdTimestamp < 5000) {
        actionType = 'kicked';
        actionText = 'User kicked';
      }
    } catch (error) {
    }
    
    try {
      const banLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: 22
      });
      
      const banLog = banLogs.entries.first();
      if (banLog && banLog.target.id === member.user.id && Date.now() - banLog.createdTimestamp < 5000) {
        actionType = 'banned';
        actionText = 'User banned';
      }
    } catch (error) {
    }
    
    const joinedAt = member.joinedAt;
    const joinedDate = joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>` : 'Unknown';
    
    const embed = new EmbedBuilder()
      .setDescription(`${actionText} ${member.user} (${member.user.tag})\nJoined: ${joinedDate}`)
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
  },
};

