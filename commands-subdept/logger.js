const { EmbedBuilder } = require('discord.js');

const LOG_CHANNELS = {
  '1458626277991780434': '1458632230023987290',
  '1458632972864454709': '1458633610914697266',
  '1461148296922796296': '1461148306745987176',
};

async function sendLog(interaction, fields, title, color) {
  try {
    const logChannelId = LOG_CHANNELS[interaction.guild.id];
    if (!logChannelId) return;
    const channel = await interaction.guild.channels.fetch(logChannelId);
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields(...fields)
      .setFooter({ text: `Moderator: ${interaction.user.tag}` })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send log:', err);
  }
}

module.exports = { sendLog };
