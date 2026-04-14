const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('View info about a user')
    .addUserOption(o => o.setName('user').setDescription('The user to look up (defaults to you)').setRequired(false)),

  async execute(interaction) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const target = interaction.options.getMember('user') || interaction.member;
    const user = target.user;

    const roles = target.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 10)
      .join(', ') || 'None';

    const joinedAt = target.joinedAt ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:F>` : 'Unknown';
    const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info — ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(target.displayHexColor || 0x5865F2)
      .addFields(
        { name: 'Username', value: user.tag, inline: true },
        { name: 'Nickname', value: target.nickname || 'None', inline: true },
        { name: 'User ID', value: user.id, inline: true },
        { name: 'Account Created', value: createdAt },
        { name: 'Joined Server', value: joinedAt },
        { name: `Roles (${target.roles.cache.size - 1})`, value: roles },
        { name: 'Bot?', value: user.bot ? 'Yes' : 'No', inline: true },
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
