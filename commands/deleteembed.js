const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MANAGEMENT_ROLE = '1491647546525880480';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteembed')
    .setDescription('Delete a bot embed message')
    .addStringOption(o => o.setName('messageid').setDescription('ID of the message to delete').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MANAGEMENT_ROLE))
      return interaction.reply({ content: '🚫 Only **Management** can use this command.', ephemeral: true });

    const messageId = interaction.options.getString('messageid');
    const channel = interaction.options.getChannel('channel');

    let message;
    try {
      message = await channel.messages.fetch(messageId);
    } catch {
      return interaction.reply({ content: '❌ Could not find that message. Make sure the ID and channel are correct.', ephemeral: true });
    }

    if (!message.author.bot)
      return interaction.reply({ content: '❌ I can only delete my own messages.', ephemeral: true });

    await message.delete();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`🗑️ Message \`${messageId}\` deleted from ${channel}.`)
      ],
      ephemeral: true
    });
  },
};
