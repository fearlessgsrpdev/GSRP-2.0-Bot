const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logger');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban this user.', ephemeral: true });

    await target.ban({ reason });

    const guildId = interaction.guild.id;
    const userId = target.user.id;
    if (!client.banHistory[guildId]) client.banHistory[guildId] = {};
    if (!client.banHistory[guildId][userId]) client.banHistory[guildId][userId] = [];
    client.banHistory[guildId][userId].push({ bannedBy: interaction.user.tag, reason, date: new Date().toISOString() });
    client.saveBanHistory();

    const embed = new EmbedBuilder()
      .setTitle('🔨 Member Banned')
      .setColor(0xED4245)
      .addFields(
        { name: 'User', value: `${target.user} (${target.user.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'Reason', value: reason },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendLog(interaction, [
      { name: 'Action', value: '🔨 Ban', inline: true },
      { name: 'User', value: `${target.user.tag} (${target.user.id})`, inline: true },
      { name: 'Reason', value: reason },
    ], 'Moderation Log', 0xED4245);
  },
};
