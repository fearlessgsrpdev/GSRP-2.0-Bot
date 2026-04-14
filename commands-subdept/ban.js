const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logger');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from this server (Head Admin+ triggers global ban across all servers)')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const target = interaction.options.getMember('user');
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetUser) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    // Check if executor has global ban permissions
    const canGlobalBan = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));

    await interaction.deferReply();

    // Save ban history
    const guildId = interaction.guild.id;
    const userId = targetUser.id;
    if (!client.banHistory[guildId]) client.banHistory[guildId] = {};
    if (!client.banHistory[guildId][userId]) client.banHistory[guildId][userId] = [];
    client.banHistory[guildId][userId].push({
      bannedBy: interaction.user.tag,
      reason,
      date: new Date().toISOString(),
      global: canGlobalBan,
    });
    client.saveBanHistory();

    const results = [];

    if (canGlobalBan) {
      // Global ban — ban from all servers
      for (const [serverName, serverInfo] of Object.entries(SERVERS)) {
        try {
          const guild = await client.guilds.fetch(serverInfo.id);
          await guild.members.ban(userId, { reason: `[Global Ban by ${interaction.user.tag}] ${reason}` });
          results.push(`✅ **${serverName.toUpperCase()}**`);

          // Log in each server
          try {
            const logChannel = await guild.channels.fetch(serverInfo.logChannel);
            const logEmbed = new EmbedBuilder()
              .setTitle('🌐 Global Ban Applied')
              .setColor(0xED4245)
              .addFields(
                { name: 'User', value: `${targetUser.tag} (${userId})`, inline: true },
                { name: 'Banned By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Origin Server', value: interaction.guild.name, inline: true },
                { name: 'Reason', value: reason },
              )
              .setThumbnail(targetUser.displayAvatarURL())
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          } catch (logErr) {
            console.error(`Failed to log in ${serverName}:`, logErr);
          }
        } catch (err) {
          results.push(`❌ **${serverName.toUpperCase()}** — ${err.message}`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('🌐 Global Ban Executed')
        .setColor(0xED4245)
        .setDescription(`**${targetUser.tag}** has been banned from all servers.`)
        .addFields(
          { name: 'User ID', value: userId, inline: true },
          { name: 'Banned By', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Server Results', value: results.join('\n') },
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } else {
      // Regular ban — this server only
      if (!target?.bannable)
        return interaction.editReply({ content: '❌ I cannot ban this user.' });

      await target.ban({ reason });

      const embed = new EmbedBuilder()
        .setTitle('🔨 Member Banned')
        .setColor(0xED4245)
        .addFields(
          { name: 'User', value: `${targetUser} (${userId})`, inline: true },
          { name: 'Moderator', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason },
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      await sendLog(interaction, [
        { name: 'Action', value: '🔨 Ban', inline: true },
        { name: 'User', value: `${targetUser.tag} (${userId})`, inline: true },
        { name: 'Reason', value: reason },
      ], 'Moderation Log', 0xED4245);
    }
  },
};
