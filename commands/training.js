const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const TRAINING_CHANNEL_ID = '1493304931099086878';

// Who can run each training type
const TRAINING_TYPES = [
  { name: 'Basic Cadet → Trooper Training', value: 'basic_cadet', minRole: null },
  { name: 'FTO Master Training (Sergeant+)', value: 'fto_master', minRole: '1493078620703297586' }, // Sergeant
  { name: 'Spike Certification (Trooper+)', value: 'spike_cert', minRole: null },
];

const TRAINING_COLORS = {
  basic_cadet: 0x5865F2,
  fto_master:  0xED4245,
  spike_cert:  0xFEE75C,
};

const TRAINING_LABELS = {
  basic_cadet: '🎓 Basic Cadet → Trooper Training',
  fto_master:  '⭐ FTO Master Training',
  spike_cert:  '📌 Spike Certification',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('training')
    .setDescription('Announce a training session')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Type of training')
        .setRequired(true)
        .addChoices(
          { name: 'Basic Cadet → Trooper Training', value: 'basic_cadet' },
          { name: 'FTO Master Training (Sergeant+)', value: 'fto_master' },
          { name: 'Spike Certification (Trooper+)', value: 'spike_cert' },
        )
    )
    .addIntegerOption(o =>
      o.setName('time')
        .setDescription('Unix timestamp for training start time (use discordtimestamp.com to generate)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('notes')
        .setDescription('Additional notes for trainees')
        .setRequired(false)
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const timestamp = interaction.options.getInteger('time');
    const notes = interaction.options.getString('notes');
    const trainer = interaction.member;

    // Build initial embed
    const embed = new EmbedBuilder()
      .setTitle(TRAINING_LABELS[type])
      .setColor(TRAINING_COLORS[type])
      .addFields(
        { name: '👮 Trainer', value: `${trainer.user}`, inline: false },
        { name: '🕐 Start Time', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
        { name: '👥 Trainees', value: '*No one has joined yet.*', inline: false },
      )
      .setDescription('> ⏰ **Make sure to join the TeamSpeak channel 10 minutes before the start time!**' + (notes ? `\n\n📋 **Notes:** ${notes}` : ''))
      .setFooter({ text: 'Click the button below to join this training session.' })
      .setTimestamp();

    // Join button
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_training_${interaction.id}`)
        .setLabel('✅  Join Training')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`leave_training_${interaction.id}`)
        .setLabel('❌  Leave Training')
        .setStyle(ButtonStyle.Danger),
    );

    // Send to training channel
    const channel = await interaction.guild.channels.fetch(TRAINING_CHANNEL_ID);
    const trainingMessage = await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: `✅ Training announced in <#${TRAINING_CHANNEL_ID}>!`, ephemeral: true });

    // Track trainees
    const trainees = new Map();

    // Collector — listens for button clicks
    const collector = trainingMessage.createMessageComponentCollector({ time: 24 * 60 * 60 * 1000 }); // 24hr

    collector.on('collect', async (btnInteraction) => {
      const userId = btnInteraction.user.id;
      const isJoin = btnInteraction.customId.startsWith('join_training_');

      if (isJoin) {
        if (trainees.has(userId)) {
          return btnInteraction.reply({ content: '⚠️ You have already joined this training!', ephemeral: true });
        }
        trainees.set(userId, btnInteraction.user);
        await btnInteraction.reply({ content: '✅ You have joined the training session!', ephemeral: true });
      } else {
        if (!trainees.has(userId)) {
          return btnInteraction.reply({ content: '⚠️ You are not in this training session.', ephemeral: true });
        }
        trainees.delete(userId);
        await btnInteraction.reply({ content: '❌ You have left the training session.', ephemeral: true });
      }

      // Update embed with current trainees
      const traineeList = trainees.size > 0
        ? [...trainees.values()].map(u => `<@${u.id}>`).join('\n')
        : '*No one has joined yet.*';

      const updatedEmbed = EmbedBuilder.from(trainingMessage.embeds[0])
        .setFields(
          { name: '👮 Trainer', value: `${trainer.user}`, inline: false },
          { name: '🕐 Start Time', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
          { name: `👥 Trainees (${trainees.size})`, value: traineeList, inline: false },
        );

      await trainingMessage.edit({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      // Disable buttons after 24 hours
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`join_training_${interaction.id}`)
          .setLabel('✅  Join Training')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`leave_training_${interaction.id}`)
          .setLabel('❌  Leave Training')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true),
      );
      await trainingMessage.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
