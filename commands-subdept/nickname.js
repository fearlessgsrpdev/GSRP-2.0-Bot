const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { SERVERS } = require('./globalconfig');

// Sub-dept allowed roles per server
const SUBDEPT_NICKNAME_ROLES = {
  '1458626277991780434': [ // DOJ
    '1458632119738695814', // Supervisory Agent
    '1458632136134492170', // Commander
  ],
  '1458632972864454709': [ // DPS
    '1458633467758645258', // Executive Officer
    '1458633485416665161', // Commander
  ],
  '1461148296922796296': [ // DSO
    '1461148297313128466', // Executive Officer
    '1461148297329639485', // Commander
  ],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Change a member\'s nickname across all servers')
    .addUserOption(o => o.setName('user').setDescription('The user to rename').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('The new nickname (leave empty to reset)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction, client) {
    const allowedRoles = SUBDEPT_NICKNAME_ROLES[interaction.guild.id] || [];
    const hasPermission = allowedRoles.some(r => interaction.member.roles.cache.has(r));
    if (!hasPermission)
      return interaction.reply({ content: '🚫 You need to be **Executive Officer or Commander** to use this command.', ephemeral: true });

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
  },
};
