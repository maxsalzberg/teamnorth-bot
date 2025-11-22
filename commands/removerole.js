import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, Colors } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from all members on the server')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('The role to remove from all members')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: 'You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const role = interaction.options.getRole('role');

    if (!role) {
      return interaction.reply({
        content: 'Role not found.',
        ephemeral: true
      });
    }

    if (role.position >= interaction.member.roles.highest.position && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You cannot remove a role that is higher or equal to your highest role.',
        ephemeral: true
      });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: 'I cannot remove a role that is higher or equal to my highest role.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const members = await interaction.guild.members.fetch();
      const membersWithRole = members.filter(member => member.roles.cache.has(role.id));
      
      if (membersWithRole.size === 0) {
        const embed = new EmbedBuilder()
          .setDescription(`No members have the role ${role.name}.`)
          .setColor(Colors.Orange);
        
        return interaction.editReply({ embeds: [embed] });
      }

      let successCount = 0;
      let failCount = 0;

      const progressEmbed = new EmbedBuilder()
        .setDescription(`Removing role **${role.name}** from ${membersWithRole.size} members...`)
        .setColor(Colors.Blue);
      
      await interaction.editReply({ embeds: [progressEmbed] });

      for (const member of membersWithRole.values()) {
        try {
          await member.roles.remove(role, `Removed by ${interaction.user.tag}`);
          successCount++;
          
          if (successCount % 10 === 0) {
            const updateEmbed = new EmbedBuilder()
              .setDescription(`Progress: **${successCount}/${membersWithRole.size}** members processed...`)
              .setColor(Colors.Blue);
            
            await interaction.editReply({ embeds: [updateEmbed] });
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to remove role from ${member.user.tag}:`, error);
        }
      }

      const resultEmbed = new EmbedBuilder()
        .setTitle('✅ Role Removal Complete')
        .setDescription(`Role **${role.name}** has been removed from members.`)
        .addFields(
          { name: '✅ Success', value: `${successCount}`, inline: true },
          { name: '❌ Failed', value: `${failCount}`, inline: true },
          { name: '📊 Total', value: `${membersWithRole.size}`, inline: true }
        )
        .setColor(failCount === 0 ? Colors.Green : Colors.Orange)
        .setTimestamp();

      await interaction.editReply({ embeds: [resultEmbed] });
    } catch (error) {
      console.error('Error in removerole command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setDescription('An error occurred while removing the role. Please try again later.')
        .setColor(Colors.Red);
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};




