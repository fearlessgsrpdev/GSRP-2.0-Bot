const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

// Hierarchy from lowest to highest
const ROLE_HIERARCHY = [
  '1491647546525880487', // Admin
  '1491647546525880484', // Sr. Admin
  '1491647546525880481', // Head Admin
  '1491647546387333147', // Staff Manager
  '1491647546525880480', // Management
];

function getHighestRank(member) {
  if (!member) return -1;
  for (let i = ROLE_HIERARCHY.length - 1; i >= 0; i--) {
    if (member.roles.cache.has(ROLE_HIERARCHY[i])) return i;
  }
  return -1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Globally ban a member from all servers (Head Admin+ only)')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetUser)
      return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    // Check executor has permission
    const canBan = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));
    if (!canBan)
      return interaction.reply({ content: '🚫 You need to be **Head Admin or higher** to use this command.', ephemeral: true });

    // Fetch target member from the main server to check their roles
    const mainGuild = await client.guilds.fetch(interaction.guild.id);
    const targetMember = await mainGuild.members.fetch(targetUser.id).catch(() => null);

    const executorRank = getHighestRank(interaction.member);
    const targetRank = getHighestRank(targetMember);

    // Block if target has equal or higher rank
    if (targetMember && targetRank >= executorRank)
      return interaction.reply({ content: `🚫 You cannot ban someone with an equal or higher role than you.`, ephemeral: true });

    await interaction.deferReply();

    const guildId = interaction.guild.id;
    const userId = targetUser.id;
    if (!client.banHistory[guildId]) client.banHistory[guildId] = {};
    if (!client.banHistory[guildId][userId]) client.banHistory[guildId][userId] = [];
    client.banHistory[guildId][userId].push({
      bannedBy: interaction.user.tag,
      reason,
      date: new Date().toISOString(),
      global: true,
    });
    client.saveBanHistory();

    const results = [];

    for (const [serverName, serverInfo] of Object.entries(SERVERS)) {
      try {
        const guild = await client.guilds.fetch(serverInfo.id);
        await guild.members.ban(userId, { reason: `[Global Ban by ${interaction.user.tag}] ${reason}` });
        results.push(`✅ **${serverName.toUpperCase()}**`);

        try {
          const logChannel = await guild.channels.fetch(serverInfo.logChannel);
          await logChannel.send({ embeds: [
            new EmbedBuilder()
              .setTitle('🌐 Global Ban Applied')
              .setColor(0xED4245)
              .addFields(
                { name: 'User', value: `${targetUser.tag} (${userId})`, inline: true },
                { name: 'Banned By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Origin Server', value: interaction.guild.name, inline: true },
                { name: 'Reason', value: reason },
              )
              .setThumbnail(targetUser.displayAvatarURL())
              .setTimestamp()
          ]});
        } catch (e) { console.error(`Log failed for ${serverName}`, e); }

      } catch (err) {
        results.push(`❌ **${serverName.toUpperCase()}** — ${err.message}`);
      }
    }

    await interaction.editReply({ embeds: [
      new EmbedBuilder()
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
        .setTimestamp()
    ]});
  },
};
