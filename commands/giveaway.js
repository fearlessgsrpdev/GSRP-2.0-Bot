const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const MANAGEMENT_ROLE_ID = '1493064221724905502';

function parseDuration(str) {
  const match = str.trim().match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return { ms: amount * 60 * 1000, label: `${amount} minute(s)` };
  if (unit === 'h') return { ms: amount * 60 * 60 * 1000, label: `${amount} hour(s)` };
  if (unit === 'd') return { ms: amount * 24 * 60 * 60 * 1000, label: `${amount} day(s)` };
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('How long? e.g. 10m, 2h, 1d').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('How many winners?').setRequired(true).setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    // Check Management role
    if (!interaction.member.roles.cache.has(MANAGEMENT_ROLE_ID))
      return interaction.reply({ content: '🚫 Only **Management** can start giveaways.', ephemeral: true });

    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners');
    const duration = parseDuration(durationStr);

    if (!duration)
      return interaction.reply({ content: '⚠️ Invalid duration. Use formats like `10m`, `2h`, or `1d`.', ephemeral: true });

    const endsAt = Math.floor((Date.now() + duration.ms) / 1000);

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setColor(0xFF73FA)
      .setDescription(`### ${prize}`)
      .addFields(
        { name: '🏆 Winners', value: `${winnerCount}`, inline: true },
        { name: '⏰ Ends', value: `<t:${endsAt}:R>`, inline: true },
        { name: '📅 End Time', value: `<t:${endsAt}:F>`, inline: false },
        { name: '👤 Hosted By', value: `${interaction.user}`, inline: false },
        { name: '🎟️ Entries', value: '**0** participants', inline: false },
      )
      .setFooter({ text: 'Click 🎉 to enter! • Good luck!' })
      .setTimestamp(new Date(endsAt * 1000));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${interaction.id}`)
        .setLabel('🎉  Enter Giveaway')
        .setStyle(ButtonStyle.Primary),
    );

    await interaction.reply({ content: '✅ Giveaway started!', ephemeral: true });
    const giveawayMessage = await interaction.channel.send({ content: '@everyone', embeds: [embed], components: [row] });

    const entrants = new Set();

    const collector = giveawayMessage.createMessageComponentCollector({ time: duration.ms });

    collector.on('collect', async (btnInteraction) => {
      const userId = btnInteraction.user.id;

      if (entrants.has(userId)) {
        // Toggle — leave giveaway
        entrants.delete(userId);
        await btnInteraction.reply({ content: '❌ You have left the giveaway.', ephemeral: true });
      } else {
        entrants.add(userId);
        await btnInteraction.reply({ content: '🎉 You have entered the giveaway! Good luck!', ephemeral: true });
      }

      // Update entry count
      const updatedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
        .setFields(
          { name: '🏆 Winners', value: `${winnerCount}`, inline: true },
          { name: '⏰ Ends', value: `<t:${endsAt}:R>`, inline: true },
          { name: '📅 End Time', value: `<t:${endsAt}:F>`, inline: false },
          { name: '👤 Hosted By', value: `${interaction.user}`, inline: false },
          { name: '🎟️ Entries', value: `**${entrants.size}** participant(s)`, inline: false },
        );

      await giveawayMessage.edit({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      // Disable button
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${interaction.id}`)
          .setLabel('🎉  Giveaway Ended')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      );

      const entrantList = [...entrants];

      if (entrantList.length === 0) {
        const noEntrantsEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
          .setTitle('🎉 GIVEAWAY ENDED 🎉')
          .setColor(0x99AAB5)
          .setFields(
            { name: '🏆 Winners', value: 'No winners — nobody entered!', inline: false },
            { name: '🎁 Prize', value: prize, inline: false },
            { name: '👤 Hosted By', value: `${interaction.user}`, inline: false },
            { name: '🎟️ Entries', value: '**0** participants', inline: false },
          )
          .setFooter({ text: 'Giveaway has ended.' });

        await giveawayMessage.edit({ embeds: [noEntrantsEmbed], components: [disabledRow] });
        await interaction.channel.send('😔 No one entered the giveaway. No winners this time!');
        return;
      }

      // Pick winners randomly
      const shuffled = entrantList.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, Math.min(winnerCount, entrantList.length));
      const winnerMentions = winners.map(id => `<@${id}>`).join('\n');

      const endedEmbed = EmbedBuilder.from(giveawayMessage.embeds[0])
        .setTitle('🎉 GIVEAWAY ENDED 🎉')
        .setColor(0xFFD700)
        .setFields(
          { name: '🏆 Winner(s)', value: winnerMentions, inline: false },
          { name: '🎁 Prize', value: prize, inline: false },
          { name: '👤 Hosted By', value: `${interaction.user}`, inline: false },
          { name: '🎟️ Total Entries', value: `**${entrantList.length}** participant(s)`, inline: false },
        )
        .setFooter({ text: 'Giveaway has ended. Congratulations to the winner(s)!' });

      await giveawayMessage.edit({ embeds: [endedEmbed], components: [disabledRow] });
      await interaction.channel.send(`🎊 Congratulations ${winnerMentions}! You won **${prize}**! 🎉`);
    });
  },
};
