const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Globally unban a user from all servers (Head Admin+ only)')
    .addStringOption(o => o.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!/^\d{17,20}$/.test(userId))
      return interaction.reply({ content: '⚠️ Please provide a valid Discord user ID.', ephemeral: true });

    const canUnban = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));
    if (!canUnban)
      return interaction.reply({ content: '🚫 You need to be **Head Admin or higher** to use this command.', ephemeral: true });

    await interaction.deferReply();

    const results = [];
    let targetTag = userId;

    for (const [serverName, serverInfo] of Object.entries(SERVERS)) {
      try {
        const guild = await client.guilds.fetch(serverInfo.id);
        const banList = await guild.bans.fetch();
        const bannedUser = banList.get(userId);

        if (!bannedUser) {
          results.push(`⚠️ **${serverName.toUpperCase()}** — Not banned`);
          continue;
        }

        targetTag = bannedUser.user.tag;
        await guild.members.unban(userId, reason);
        results.push(`✅ **${serverName.toUpperCase()}**`);

        try {
          const logChannel = await guild.channels.fetch(serverInfo.logChannel);
          await logChannel.send({ embeds: [
            new EmbedBuilder()
              .setTitle('🌐 Global Unban Applied')
              .setColor(0x57F287)
              .addFields(
                { name: 'User', value: `${bannedUser.user.tag} (${userId})`, inline: true },
                { name: 'Unbanned By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Origin Server', value: interaction.guild.name, inline: true },
                { name: 'Reason', value: reason },
              )
              .setThumbnail(bannedUser.user.displayAvatarURL())
              .setTimestamp()
          ]});
        } catch (e) { console.error(`Log failed for ${serverName}`, e); }

      } catch (err) {
        results.push(`❌ **${serverName.toUpperCase()}** — ${err.message}`);
      }
    }

    await interaction.editReply({ embeds: [
      new EmbedBuilder()
        .setTitle('🌐 Global Unban Executed')
        .setColor(0x57F287)
        .setDescription(`**${targetTag}** has been unbanned from all servers.`)
        .addFields(
          { name: 'User ID', value: userId, inline: true },
          { name: 'Unbanned By', value: `${interaction.user}`, inline: true },
          { name: 'Reason', value: reason },
          { name: 'Server Results', value: results.join('\n') },
        )
        .setTimestamp()
    ]});
  },
};
