const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');

const BOT_COMMANDS_CHANNEL = '1491647555287912522';
const PUNISHMENT_LOG_CHANNEL = '1491647554725744675';

const STRIKE_ROLES = [
  '1491647546525880488', // Sergeant
  '1491647546525880485', // Lieutenant
  '1491647546525880484', // Sr. Admin
  '1491647546525880482', // Captain
  '1491647546525880481', // Head Admin
  '1491647546387333148', // Major
  '1491647546387333147', // Staff Manager
  '1491647546525880480', // Management
];

const COLOR_MAP = {
  'Strike': 0xFF8C00,
  'Removal_without_Ban': 0xED4245,
  'Removal_with_Ban': 0x8B0000,
};

const LABEL_MAP = {
  'Strike': '⚠️ Strike',
  'Removal_without_Ban': '🚪 Removal without Ban',
  'Removal_with_Ban': '🔨 Removal with Ban',
};

function buildEmbed(type, data, submitter) {
  return new EmbedBuilder()
    .setTitle(`${LABEL_MAP[type]} — Punishment Log`)
    .setColor(COLOR_MAP[type])
    .addFields(
      { name: '👮 Submitted By', value: `<@${data.your_id}> (\`${data.your_id}\`)`, inline: true },
      { name: '🎯 Offender', value: `<@${data.offender_id}> (\`${data.offender_id}\`)`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '📋 Punishment Type', value: `**${LABEL_MAP[type]}**`, inline: true },
      { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: '📝 What Happened', value: data.what_happened },
      { name: '👥 Others Involved', value: data.others_involved },
      { name: '🔗 Evidence', value: data.evidence },
    )
    .setFooter({ text: `Logged by ${submitter.tag} • ${submitter.id}` })
    .setTimestamp();
}

function buildModal(type, existing = {}) {
  const modal = new ModalBuilder()
    .setCustomId(`punish_form_${type}`)
    .setTitle(`📋 Punishment Log — ${LABEL_MAP[type]}`);

  const fields = [
    new TextInputBuilder().setCustomId('your_id').setLabel('Your Discord ID').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 123456789012345678').setRequired(true),
    new TextInputBuilder().setCustomId('offender_id').setLabel("Offender's Discord ID").setStyle(TextInputStyle.Short).setPlaceholder('e.g. 123456789012345678').setRequired(true),
    new TextInputBuilder().setCustomId('what_happened').setLabel('What happened?').setStyle(TextInputStyle.Paragraph).setPlaceholder('Describe the incident in detail...').setRequired(true),
    new TextInputBuilder().setCustomId('others_involved').setLabel('Others Involved').setStyle(TextInputStyle.Short).setPlaceholder('Discord IDs or names, or N/A').setRequired(true),
    new TextInputBuilder().setCustomId('evidence').setLabel('Evidence (links/screenshots or N/A)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Provide links to evidence, or type N/A').setRequired(true),
  ];

  // Pre-fill if editing
  if (existing.your_id) fields[0].setValue(existing.your_id);
  if (existing.offender_id) fields[1].setValue(existing.offender_id);
  if (existing.what_happened) fields[2].setValue(existing.what_happened);
  if (existing.others_involved) fields[3].setValue(existing.others_involved);
  if (existing.evidence) fields[4].setValue(existing.evidence);

  modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
  return modal;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Submit a punishment log'),

  async execute(interaction) {
    if (interaction.channelId !== BOT_COMMANDS_CHANNEL)
      return interaction.reply({ content: `🚫 This command can only be used in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    // Step 1 — Show type selection buttons
    const typeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('punish_type_Strike').setLabel('⚠️  Strike').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('punish_type_Removal_without_Ban').setLabel('🚪  Removal without Ban').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('punish_type_Removal_with_Ban').setLabel('🔨  Removal with Ban').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 Punishment Log')
          .setColor(0xFF8C00)
          .setDescription('Select the punishment type below to begin filling out the log.')
      ],
      components: [typeRow],
      ephemeral: true,
    });

    // Step 2 — Wait for type button click
    const typeCollector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && i.customId.startsWith('punish_type_'),
      time: 5 * 60 * 1000,
      max: 1,
    });

    typeCollector.on('collect', async (typeInteraction) => {
      const type = typeInteraction.customId.replace('punish_type_', '');

      // Check strike permission
      if (type === 'Strike') {
        const hasRole = STRIKE_ROLES.some(r => interaction.member.roles.cache.has(r));
        if (!hasRole) {
          return typeInteraction.update({
            embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('🚫 You do not have permission to issue a **Strike**.')],
            components: [],
          });
        }
      }

      // Show modal
      await typeInteraction.showModal(buildModal(type));

      let formData = {};
      let previewMsg = null;

      const handleModal = async () => {
        const modalSubmit = await typeInteraction.awaitModalSubmit({
          filter: i => i.customId === `punish_form_${type}` && i.user.id === interaction.user.id,
          time: 10 * 60 * 1000,
        }).catch(() => null);

        if (!modalSubmit) return;

        formData = {
          your_id: modalSubmit.fields.getTextInputValue('your_id'),
          offender_id: modalSubmit.fields.getTextInputValue('offender_id'),
          what_happened: modalSubmit.fields.getTextInputValue('what_happened'),
          others_involved: modalSubmit.fields.getTextInputValue('others_involved'),
          evidence: modalSubmit.fields.getTextInputValue('evidence'),
        };

        const previewEmbed = buildEmbed(type, formData, interaction.user);

        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('punish_edit').setLabel('✏️  Edit & Resubmit').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('punish_confirm').setLabel('✅  Confirm & Post').setStyle(ButtonStyle.Success),
        );

        // Show preview
        if (previewMsg) {
          await modalSubmit.update({ embeds: [previewEmbed], components: [actionRow] });
        } else {
          await modalSubmit.reply({ embeds: [previewEmbed], components: [actionRow], ephemeral: true });
          previewMsg = true;
        }

        // Wait for confirm or edit
        const actionCollector = modalSubmit.channel.createMessageComponentCollector({
          filter: i => i.user.id === interaction.user.id && ['punish_edit', 'punish_confirm'].includes(i.customId),
          time: 15 * 60 * 1000,
          max: 1,
        });

        actionCollector.on('collect', async (actionInteraction) => {
          if (actionInteraction.customId === 'punish_edit') {
            // Re-open modal with existing data pre-filled
            await actionInteraction.showModal(buildModal(type, formData));
            await handleModal();
          } else if (actionInteraction.customId === 'punish_confirm') {
            // Post to punishment-logs
            try {
              const logChannel = await interaction.guild.channels.fetch(PUNISHMENT_LOG_CHANNEL);
              await logChannel.send({ embeds: [buildEmbed(type, formData, interaction.user)] });
              await actionInteraction.update({
                embeds: [new EmbedBuilder().setColor(0x57F287).setDescription('✅ Punishment log submitted successfully!')],
                components: [],
              });
            } catch (err) {
              console.error('Failed to post punishment log:', err);
              await actionInteraction.update({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ Failed to submit. Please contact an administrator.')],
                components: [],
              });
            }
          }
        });
      };

      await handleModal();
    });
  },
};
