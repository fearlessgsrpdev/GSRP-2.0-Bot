const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logger');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID')
    .addStringOption(o => o.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!/^\d{17,20}$/.test(userId))
      return interaction.reply({ content: '⚠️ Please provide a valid Discord user ID.', ephemeral: true });

    try {
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);
      if (!bannedUser) return interaction.reply({ content: '⚠️ That user is not banned.', ephemeral: true });

      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setTitle('✅ User Unbanned')
        .setColor(0x57F287)
        .addFields(
          { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
          { name: 'Moderator', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason },
        )
        .setThumbnail(bannedUser.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction, [
        { name: 'Action', value: '✅ Unban', inline: true },
        { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
        { name: 'Reason', value: reason },
      ], 'Moderation Log', 0x57F287);
    } catch (err) {
      await interaction.reply({ content: `❌ Could not unban: \`${err.message}\``, ephemeral: true });
    }
  },
};
