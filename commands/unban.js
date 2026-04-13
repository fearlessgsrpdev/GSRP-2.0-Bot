const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .addStringOption(o => o.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Validate it looks like a Discord ID
    if (!/^\d{17,20}$/.test(userId))
      return interaction.reply({ content: '⚠️ Please provide a valid Discord user ID.', ephemeral: true });

    try {
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);

      if (!bannedUser)
        return interaction.reply({ content: '⚠️ That user is not banned in this server.', ephemeral: true });

      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setTitle('✅ User Unbanned')
        .setColor(0x57F287)
        .addFields(
          { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
          { name: 'Unbanned By', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setThumbnail(bannedUser.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ content: `❌ Could not unban: \`${err.message}\``, ephemeral: true });
    }
  },
};
