const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendLog } = require('./logger');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of messages from this channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const amount = interaction.options.getInteger('amount');
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.bulkDelete(amount, true);
    await interaction.editReply({ content: `🧹 Deleted **${amount}** message(s).` });
    await sendLog(interaction, [
      { name: 'Action', value: '🧹 Purge', inline: true },
      { name: 'Channel', value: `${interaction.channel}`, inline: true },
      { name: 'Messages Deleted', value: `${amount}`, inline: true },
    ], 'Moderation Log', 0x99AAB5);
  },
};
