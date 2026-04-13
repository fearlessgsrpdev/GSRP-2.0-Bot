const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TRAINING_CHANNEL_ID = '1491647569053356156';

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

function parseTimeCST(timeStr) {
  const now = new Date();
  const match12 = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  let hours, minutes;
  if (match12) {
    hours = parseInt(match12[1]);
    minutes = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (match24) {
    hours = parseInt(match24[1]);
    minutes = parseInt(match24[2]);
  } else { return null; }

  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours + 6, minutes, 0));
  if (utcDate.getTime() < Date.now()) utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  return Math.floor(utcDate.getTime() / 1000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('training')
    .setDescription('Announce a training session')
    .addStringOption(o => o.setName('type').setDescription('Type of training').setRequired(true)
      .addChoices(
        { name: 'Basic Cadet → Trooper Training', value: 'basic_cadet' },
        { name: 'FTO Master Training (Sergeant+)', value: 'fto_master' },
        { name: 'Spike Certification (Trooper+)', value: 'spike_cert' },
      ))
    .addStringOption(o => o.setName('time').setDescription('Start time in CST — e.g. "3:00 PM" or "15:00"').setRequired(true))
    .addStringOption(o => o.setName('notes').setDescription('Additional notes for trainees').setRequired(false)),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const timeStr = interaction.options.getString('time');
    const notes = interaction.options.getString('notes');
    const trainer = interaction.member;

    const timestamp = parseTimeCST(timeStr);
    if (!timestamp)
      return interaction.reply({ content: '⚠️ Invalid time format. Use `3:00 PM` or `15:00`.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(TRAINING_LABELS[type])
      .setColor(TRAINING_COLORS[type])
      .setDescription('> ⏰ **Make sure to join the TeamSpeak channel 10 minutes before the start time!**' + (notes ? `\n\n📋 **Notes:** ${notes}` : ''))
      .addFields(
        { name: '👮 Trainer', value: `${trainer.user}`, inline: false },
        { name: '🕐 Start Time', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
        { name: '👥 Trainees', value: '*No one has joined yet.*', inline: false },
      )
      .setFooter({ text: 'Click the button below to join this training session.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`join_training_${interaction.id}`).setLabel('✅  Join Training').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`leave_training_${interaction.id}`).setLabel('❌  Leave Training').setStyle(ButtonStyle.Danger),
    );

    const channel = await interaction.guild.channels.fetch(TRAINING_CHANNEL_ID);
    const trainingMessage = await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Training announced in <#${TRAINING_CHANNEL_ID}>!`, ephemeral: true });

    const trainees = new Map();
    const collector = trainingMessage.createMessageComponentCollector({ time: 24 * 60 * 60 * 1000 });

    collector.on('collect', async (btnInteraction) => {
      const userId = btnInteraction.user.id;
      const isJoin = btnInteraction.customId.startsWith('join_training_');
      if (isJoin) {
        if (trainees.has(userId)) return btnInteraction.reply({ content: '⚠️ You already joined!', ephemeral: true });
        trainees.set(userId, btnInteraction.user);
        await btnInteraction.reply({ content: '✅ You joined the training!', ephemeral: true });
      } else {
        if (!trainees.has(userId)) return btnInteraction.reply({ content: '⚠️ You are not in this training.', ephemeral: true });
        trainees.delete(userId);
        await btnInteraction.reply({ content: '❌ You left the training.', ephemeral: true });
      }
      const traineeList = trainees.size > 0 ? [...trainees.values()].map(u => `<@${u.id}>`).join('\n') : '*No one has joined yet.*';
      const updatedEmbed = EmbedBuilder.from(trainingMessage.embeds[0]).setFields(
        { name: '👮 Trainer', value: `${trainer.user}`, inline: false },
        { name: '🕐 Start Time', value: `<t:${timestamp}:F> (<t:${timestamp}:R>)`, inline: false },
        { name: `👥 Trainees (${trainees.size})`, value: traineeList, inline: false },
      );
      await trainingMessage.edit({ embeds: [updatedEmbed], components: [row] });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`join_training_${interaction.id}`).setLabel('✅  Join Training').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId(`leave_training_${interaction.id}`).setLabel('❌  Leave Training').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await trainingMessage.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
};
