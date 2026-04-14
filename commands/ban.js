const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

// Hierarchy from lowest (0) to highest (4)
const ROLE_HIERARCHY = [
  '1491647546525880487', // Admin        — rank 0
  '1491647546525880484', // Sr. Admin    — rank 1
  '1491647546525880481', // Head Admin   — rank 2
  '1491647546387333147', // Staff Manager — rank 3
  '1491647546525880480', // Management   — rank 4
];

function getHighestRank(member) {
  if (!member) return -1;
  let highest = -1;
  for (let i = 0; i < ROLE_HIERARCHY.length; i++) {
    if (member.roles.cache.has(ROLE_HIERARCHY[i])) highest = i;
  }
  return highest;
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

    // Prevent self-ban
    if (targetUser.id === interaction.user.id)
      return interaction.reply({ content: '🚫 You cannot ban yourself.', ephemeral: true });

    // Check executor has Head Admin+ permission
    const canBan = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));
    if (!canBan)
      return interaction.reply({ content: '🚫 You need to be **Head Admin or higher** to use this command.', ephemeral: true });

    // Fetch target from main server to get their roles
    let targetMember = null;
    try {
      targetMember = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      // User not in main server — allow ban to proceed
      targetMember = null;
    }

    const executorRank = getHighestRank(interaction.member);
    const targetRank = getHighestRank(targetMember);

    console.log(`Ban attempt: executor rank ${executorRank}, target rank ${targetRank}`);

    // If target has a rank and it's >= executor's rank, block it
    if (targetMember !== null && targetRank >= executorRank && targetRank >= 0) {
      const rankNames = ['Admin', 'Sr. Admin', 'Head Admin', 'Staff Manager', 'Management'];
      return interaction.reply({
        content: `🚫 You cannot ban **${targetUser.tag}** — they are ${targetRank > executorRank ? 'higher' : 'the same'} rank as you (${rankNames[targetRank]}).`,
        ephemeral: true
      });
    }

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
