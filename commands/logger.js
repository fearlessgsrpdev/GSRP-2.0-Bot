const { EmbedBuilder } = require('discord.js');

const LOG_CHANNEL_ID = '1493296233245179964';

async function sendLog(interaction, fields, title, color) {
  try {
    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields(...fields)
      .setFooter({ text: `Moderator: ${interaction.user.tag} • ID: ${interaction.user.id}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send log:', err);
  }
}

module.exports = { sendLog };
