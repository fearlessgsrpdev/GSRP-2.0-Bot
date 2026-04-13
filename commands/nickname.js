const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription("Change a member's nickname")
    .addUserOption(o => o.setName('user').setDescription('The user to rename').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const newNick = interaction.options.getString('nickname') || null;
    const oldNick = target.nickname || target.user.username;

    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    await target.setNickname(newNick);

    const embed = new EmbedBuilder()
      .setTitle('✏️ Nickname Changed')
      .setColor(0x5865F2)
      .addFields(
        { name: 'User', value: `${target.user}`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Old Nickname', value: oldNick, inline: true },
        { name: 'New Nickname', value: newNick || target.user.username, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendLog(interaction, [
      { name: 'Action', value: '✏️ Nickname Change', inline: true },
      { name: 'User', value: `${target.user.tag} (${target.user.id})`, inline: true },
      { name: 'Old Nickname', value: oldNick, inline: true },
      { name: 'New Nickname', value: newNick || target.user.username, inline: true },
    ], 'Moderation Log', 0x5865F2);
  },
};
