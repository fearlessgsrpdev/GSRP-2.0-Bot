const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

const LOG_CHANNELS = {
  '1458626277991780434': '1458632230023987290',
  '1458632972864454709': '1458633610914697266',
  '1461148296922796296': '1461148306745987176',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Globally ban a member from all servers (Head Admin+ only)')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetUser)
      return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    const canBan = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));
    if (!canBan)
      return interaction.reply({ content: '🚫 You need to be **Head Admin or higher** to use this command.', ephemeral: true });

    await interaction.deferReply();

    const results = [];

    for (const [serverName, serverInfo] of Object.entries(SERVERS)) {
      try {
        const guild = await client.guilds.fetch(serverInfo.id);
        await guild.members.ban(targetUser.id, { reason: `[Global Ban by ${interaction.user.tag}] ${reason}` });
        results.push(`✅ **${serverName.toUpperCase()}**`);

        try {
          const logChannel = await guild.channels.fetch(serverInfo.logChannel);
          await logChannel.send({ embeds: [
            new EmbedBuilder()
              .setTitle('🌐 Global Ban Applied')
              .setColor(0xED4245)
              .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
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
          { name: 'User ID', value: targetUser.id, inline: true },
          { name: 'Banned By', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Server Results', value: results.join('\n') },
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp()
    ]});
  },
};
