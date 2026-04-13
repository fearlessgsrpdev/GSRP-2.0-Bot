const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banrecord')
    .setDescription('View the ban history of a user')
    .addUserOption(o => o.setName('user').setDescription('The user to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, client) {
    const target = interaction.options.getUser('user');
    const guildHistory = client.banHistory[interaction.guild.id];
    const userHistory = guildHistory && guildHistory[target.id];

    const embed = new EmbedBuilder()
      .setTitle(`📋 Ban Record — ${target.tag}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0xFEE75C)
      .setTimestamp();

    if (!userHistory || userHistory.length === 0) {
      embed.setDescription('✅ No ban history found for this user.');
    } else {
      embed.setDescription(`**${userHistory.length}** ban(s) on record:`);
      userHistory.forEach((entry, i) => {
        const date = new Date(entry.date).toUTCString();
        embed.addFields({
          name: `Ban #${i + 1} — ${date}`,
          value: `**Reason:** ${entry.reason}\n**Banned By:** ${entry.bannedBy}`,
        });
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
