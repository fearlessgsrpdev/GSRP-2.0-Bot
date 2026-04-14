const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');
const { sendLog } = require('./logger');
const { SERVERS } = require('./globalconfig');

// Sr. Admin+ can use nickname in main server
const NICKNAME_ROLES = [
  '1491647546525880480', // Management
  '1491647546387333147', // Staff Manager
  '1491647546525880481', // Head Admin
  '1491647546525880484', // Sr. Admin
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change a member\'s nickname across all servers')
    .addUserOption(o => o.setName('user').setDescription('The user to rename').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction, client) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const hasPermission = NICKNAME_ROLES.some(r => interaction.member.roles.cache.has(r));
    if (!hasPermission)
      return interaction.reply({ content: '🚫 You need to be **Sr. Admin or higher** to use this command.', ephemeral: true });

    const targetUser = interaction.options.getUser('user');
    const newNick = interaction.options.getString('nickname') || null;

    if (!targetUser)
      return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    await interaction.deferReply();

    const results = [];

    for (const [serverName, serverInfo] of Object.entries(SERVERS)) {
      try {
        const guild = await client.guilds.fetch(serverInfo.id);
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) { results.push(`⚠️ **${serverName.toUpperCase()}** — User not in server`); continue; }
        await member.setNickname(newNick, `Changed by ${interaction.user.tag}`);
        results.push(`✅ **${serverName.toUpperCase()}**`);
      } catch (err) {
        results.push(`❌ **${serverName.toUpperCase()}** — ${err.message}`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('✏️ Nickname Changed Globally')
      .setColor(0x5865F2)
      .addFields(
        { name: 'User', value: `${targetUser}`, inline: true },
        { name: 'Moderator', value: `${interaction.user}`, inline: true },
        { name: 'New Nickname', value: newNick || '*Reset to default*', inline: true },
        { name: 'Server Results', value: results.join('\n') },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendLog(interaction, [
      { name: 'Action', value: '✏️ Global Nickname Change', inline: true },
      { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'New Nickname', value: newNick || 'Reset', inline: true },
    ], 'Moderation Log', 0x5865F2);
  },
};
