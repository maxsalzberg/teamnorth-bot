import { Events, EmbedBuilder } from 'discord.js';

export default {
  name: Events.GuildMemberRemove,
  async execute(member) {
    console.log(`[guildMemberRemove] Processing member leave: ${member.user?.id || 'unknown'}`);
    
    const logChannelId = process.env.LOG_CHANNEL_ID;
    
    if (!logChannelId) {
      console.warn('[guildMemberRemove] LOG_CHANNEL_ID not set in environment variables');
      return;
    }
    
    if (!member?.user) {
      console.error('[guildMemberRemove] Member or user object is missing');
      return;
    }
    
    if (!member.guild) {
      console.error('[guildMemberRemove] Guild object is missing');
      return;
    }
    
    try {
      let logChannel;
      try {
        logChannel = await member.guild.channels.fetch(logChannelId);
      } catch (fetchError) {
        console.error(`[guildMemberRemove] Failed to fetch channel ${logChannelId}:`, fetchError.message);
        return;
      }
      
      if (!logChannel) {
        console.error(`[guildMemberRemove] Log channel with ID ${logChannelId} not found`);
        return;
      }
      
      if (!logChannel.isTextBased()) {
        console.error(`[guildMemberRemove] Channel ${logChannelId} is not a text-based channel`);
        return;
      }
      
      const botMember = member.guild.members.me || await member.guild.members.fetch(member.client.user?.id).catch(() => null);
      if (botMember && !logChannel.permissionsFor(botMember)?.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        console.error(`[guildMemberRemove] Bot lacks permissions in channel ${logChannelId}`);
        return;
      }
      
      const user = member.user;
      const username = user.username || 'Unknown';
      const discriminator = user.discriminator || '0000';
      const userTag = user.tag || `${username}#${discriminator}`;
      const userId = user.id || 'Unknown';
      
      let avatarURL;
      try {
        avatarURL = user.displayAvatarURL({ size: 256 }) || user.defaultAvatarURL;
      } catch (avatarError) {
        console.warn(`[guildMemberRemove] Failed to get avatar URL:`, avatarError.message);
        avatarURL = user.defaultAvatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
      }
      
      let joinedDate = 'Unknown';
      let joinedTimestamp = null;
      
      if (member.joinedAt) {
        try {
          joinedTimestamp = Math.floor(member.joinedAt.getTime() / 1000);
          joinedDate = `<t:${joinedTimestamp}:F>`;
        } catch (dateError) {
          console.warn(`[guildMemberRemove] Failed to format join date:`, dateError.message);
          joinedDate = member.joinedAt.toISOString();
        }
      } else {
        try {
          const fullMember = await member.guild.members.fetch(userId).catch(() => null);
          if (fullMember?.joinedAt) {
            joinedTimestamp = Math.floor(fullMember.joinedAt.getTime() / 1000);
            joinedDate = `<t:${joinedTimestamp}:F>`;
          }
        } catch (fetchError) {
          console.warn(`[guildMemberRemove] Could not fetch full member data:`, fetchError.message);
        }
      }
      
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: userTag, 
          iconURL: avatarURL 
        })
        .setDescription(`**User left** ${user}\n\n**Joined:** ${joinedDate}`)
        .setColor(0x5DADE2)
        .setThumbnail(avatarURL)
        .setTimestamp()
        .setFooter({ text: `User ID: ${userId}` });
      
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          await logChannel.send({ embeds: [embed] });
          console.log(`[guildMemberRemove] Successfully logged member leave: ${userTag} (${userId})`);
          return;
        } catch (sendError) {
          lastError = sendError;
          retries--;
          
          console.error(`[guildMemberRemove] Failed to send message (${3 - retries}/3):`, sendError.message);
          
          if (sendError.code === 50001 || sendError.code === 50013 || sendError.code === 10003) {
            console.error(`[guildMemberRemove] Fatal error (permissions/channel), stopping retries`);
            break;
          }
          
          if (retries > 0) {
            const delay = Math.pow(2, 3 - retries) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      console.error(`[guildMemberRemove] Failed to send log message after all retries:`, lastError);
      
    } catch (error) {
      console.error('[guildMemberRemove] Unexpected error:', error);
      console.error('[guildMemberRemove] Error stack:', error.stack);
    }
  },
};

