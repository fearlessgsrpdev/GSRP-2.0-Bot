const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MANAGEMENT_ROLE_ID = '1491647546525880480';

function parseDuration(str) {
  const match = str.trim().match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return { ms: amount * 60 * 1000, label: `${amount} Minute(s)` };
  if (unit === 'h') return { ms: amount * 60 * 60 * 1000, label: `${amount} Hour(s)` };
  if (unit === 'd') return { ms: amount * 24 * 60 * 60 * 1000, label: `${amount} Day(s)` };
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('How long? e.g. 10m, 2h, 1d').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('How many winners?').setRequired(true).setMinValue(1).setMaxValue(20))
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the giveaway in').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MANAGEMENT_ROLE_ID))
      return interaction.reply({ content: '🚫 Only **Management** can start giveaways.', ephemeral: true });

    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners');
    const channel = interaction.options.getChannel('channel');
    const duration = parseDuration(durationStr);

    if (!duration) return interaction.reply({ content: '⚠️ Invalid duration. Use `10m`, `2h`, or `1d`.', ephemeral: true });

    const endsAt = Math.floor((Date.now() + duration.ms) / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('🎊  G I V E A W A Y')
      .setDescription(`## 🎁  ${prize}\n\u200B`)
      .addFields(
        { name: '🏅  Winners', value: `\`${winnerCount}\``, inline: true },
        { name: '⏳  Duration', value: `\`${duration.label}\``, inline: true },
        { name: '🕐  Ends', value: `<t:${endsAt}:R>`, inline: true },
        { name: '📅  End Date', value: `<t:${endsAt}:F>`, inline: false },
        { name: '🎟️  Entries', value: '`0` participants', inline: true },
        { name: '🎙️  Hosted By', value: `${interaction.user}`, inline: true },
      )
      .setFooter({ text: '◈  Click the button below to enter  ◈' })
      .setTimestamp(new Date(endsAt * 1000));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`giveaway_enter_${interaction.id}`).setLabel('  Enter Giveaway  ').setEmoji('🎉').setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ content: `✅ Giveaway posted in ${channel}!`, ephemeral: true });
    const giveawayMessage = await channel.send({ embeds: [embed], components: [row] });
    const entrants = new Set();
    const collector = giveawayMessage.createMessageComponentCollector({ time: duration.ms });

    collector.on('collect', async (btnInteraction) => {
      const userId = btnInteraction.user.id;
      if (entrants.has(userId)) {
        entrants.delete(userId);
        await btnInteraction.reply({ content: '❌ You left the giveaway.', ephemeral: true });
      } else {
        entrants.add(userId);
        await btnInteraction.reply({ content: '🎉 You\'re in! Good luck!', ephemeral: true });
      }
      const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]).setFields(
        { name: '🏅  Winners', value: `\`${winnerCount}\``, inline: true },
        { name: '⏳  Duration', value: `\`${duration.label}\``, inline: true },
        { name: '🕐  Ends', value: `<t:${endsAt}:R>`, inline: true },
        { name: '📅  End Date', value: `<t:${endsAt}:F>`, inline: false },
        { name: '🎟️  Entries', value: `\`${entrants.size}\` participant(s)`, inline: true },
        { name: '🎙️  Hosted By', value: `${interaction.user}`, inline: true },
      );
      await giveawayMessage.edit({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_enter_${interaction.id}`).setLabel('  Giveaway Ended  ').setEmoji('🔒').setStyle(ButtonStyle.Secondary).setDisabled(true),
      );
      const entrantList = [...entrants];
      if (entrantList.length === 0) {
        const noWinnersEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]).setTitle('🔒  GIVEAWAY ENDED').setColor(0x95A5A6)
          .setFields(
            { name: '🏅  Winners', value: '`None` — Nobody entered', inline: true },
            { name: '🎁  Prize', value: prize, inline: false },
            { name: '🎟️  Total Entries', value: '`0` participants', inline: true },
            { name: '🎙️  Hosted By', value: `${interaction.user}`, inline: true },
          ).setFooter({ text: '◈  This giveaway has ended  ◈' });
        await giveawayMessage.edit({ embeds: [noWinnersEmbed], components: [disabledRow] });
        await channel.send({ embeds: [new EmbedBuilder().setColor(0x95A5A6).setDescription('😔  No one entered the giveaway.')] });
        return;
      }
      const winners = [...entrantList].sort(() => Math.random() - 0.5).slice(0, Math.min(winnerCount, entrantList.length));
      const winnerMentions = winners.map(id => `<@${id}>`).join('\n');
      const endedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0]).setTitle('🏆  GIVEAWAY ENDED').setColor(0x2ECC71)
        .setFields(
          { name: `🏆  Winner${winners.length > 1 ? 's' : ''}`, value: winnerMentions, inline: false },
          { name: '🎁  Prize', value: prize, inline: true },
          { name: '🎟️  Total Entries', value: `\`${entrantList.length}\` participant(s)`, inline: true },
          { name: '🎙️  Hosted By', value: `${interaction.user}`, inline: false },
        ).setFooter({ text: '◈  Congratulations to the winner(s)!  ◈' });
      await giveawayMessage.edit({ embeds: [endedEmbed], components: [disabledRow] });
      await channel.send({ embeds: [new EmbedBuilder().setColor(0x2ECC71).setTitle('🎊  We have a winner!').setDescription(`Congratulations ${winnerMentions}!\nYou won **${prize}**! Please contact the host to claim your prize. 🎁`).setTimestamp()] });
    });
  },
};
