const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { SERVERS, GLOBAL_BAN_ROLES } = require('./globalconfig');

const LOG_CHANNELS = {
  '1458626277991780434': '1458632230023987290', // DOJ
  '1458632972864454709': '1458633610914697266', // DPS
  '1461148296922796296': '1461148306745987176', // DSO
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member (Head Admin+ triggers global ban across all servers)')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!targetUser) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    const canGlobalBan = GLOBAL_BAN_ROLES.some(r => interaction.member.roles.cache.has(r));

    await interaction.deferReply();

    if (canGlobalBan) {
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

    } else {
      if (!target?.bannable)
        return interaction.editReply({ content: '❌ I cannot ban this user.' });

      await target.ban({ reason });

      await interaction.editReply({ embeds: [
        new EmbedBuilder()
          .setTitle('🔨 Member Banned')
          .setColor(0xED4245)
          .addFields(
            { name: 'User', value: `${targetUser} (${targetUser.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user}`, inline: true },
            { name: 'Reason', value: reason },
          )
          .setThumbnail(targetUser.displayAvatarURL())
          .setTimestamp()
      ]});

      try {
        const logChannelId = LOG_CHANNELS[interaction.guild.id];
        if (logChannelId) {
          const logChannel = await interaction.guild.channels.fetch(logChannelId);
          await logChannel.send({ embeds: [
            new EmbedBuilder()
              .setTitle('Moderation Log')
              .setColor(0xED4245)
              .addFields(
                { name: 'Action', value: '🔨 Ban', inline: true },
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Reason', value: reason },
              )
              .setFooter({ text: `Moderator: ${interaction.user.tag}` })
              .setTimestamp()
          ]});
        }
      } catch (e) { console.error('Log failed', e); }
    }
  },
};
