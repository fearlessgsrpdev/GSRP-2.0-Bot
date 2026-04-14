const {
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder
} = require('discord.js');

const BOT_COMMANDS_CHANNEL = '1491647555287912522';
const PUNISHMENT_LOG_CHANNEL = '1491647554725744675';

const STRIKE_ROLES = [
  '1491647546525880488', '1491647546525880485', '1491647546525880484',
  '1491647546525880482', '1491647546525880481', '1491647546387333148',
  '1491647546387333147', '1491647546525880480',
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

// Store session data per user
const sessions = new Map();

function buildPreviewEmbed(type, data, user) {
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
    .setFooter({ text: `Preview • Logged by ${user.tag}` })
    .setTimestamp();
}

function buildModal(type, existing = {}) {
  const modal = new ModalBuilder()
    .setCustomId(`punish_modal_${type}`)
    .setTitle(`📋 ${LABEL_MAP[type]}`);

  const f = (id, label, style, placeholder, value) => {
    const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setPlaceholder(placeholder).setRequired(true);
    if (value) t.setValue(value);
    return new ActionRowBuilder().addComponents(t);
  };

  modal.addComponents(
    f('your_id', 'Your Discord ID', TextInputStyle.Short, 'e.g. 123456789012345678', existing.your_id),
    f('offender_id', "Offender's Discord ID", TextInputStyle.Short, 'e.g. 123456789012345678', existing.offender_id),
    f('what_happened', 'What happened?', TextInputStyle.Paragraph, 'Describe the incident in detail...', existing.what_happened),
    f('others_involved', 'Others Involved', TextInputStyle.Short, 'Discord IDs or names, or N/A', existing.others_involved),
    f('evidence', 'Evidence (links or N/A)', TextInputStyle.Paragraph, 'Provide links to evidence, or type N/A', existing.evidence),
  );

  return modal;
}

const actionRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('punish_edit').setLabel('✏️  Edit & Resubmit').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('punish_confirm').setLabel('✅  Confirm & Post').setStyle(ButtonStyle.Success),
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Submit a punishment log'),

  async execute(interaction) {
    if (interaction.channelId !== BOT_COMMANDS_CHANNEL)
      return interaction.reply({ content: `🚫 This command can only be used in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const typeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('punish_type_Strike').setLabel('⚠️  Strike').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('punish_type_Removal_without_Ban').setLabel('🚪  Removal without Ban').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('punish_type_Removal_with_Ban').setLabel('🔨  Removal with Ban').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle('📋 Punishment Log').setColor(0xFF8C00).setDescription('Select the punishment type below to begin.')],
      components: [typeRow],
      ephemeral: true,
    });
  },

  // Handle all button and modal interactions for /punish
  async handleInteraction(interaction, client) {
    const userId = interaction.user.id;

    // ── Type button clicked ──────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith('punish_type_')) {
      const type = interaction.customId.replace('punish_type_', '');

      if (type === 'Strike') {
        const member = interaction.member;
        const hasRole = STRIKE_ROLES.some(r => member.roles.cache.has(r));
        if (!hasRole)
          return interaction.reply({ content: '🚫 You do not have permission to issue a **Strike**.', ephemeral: true });
      }

      sessions.set(userId, { type, data: {} });
      await interaction.showModal(buildModal(type));
      return;
    }

    // ── Modal submitted ──────────────────────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith('punish_modal_')) {
      const type = interaction.customId.replace('punish_modal_', '');
      const data = {
        your_id: interaction.fields.getTextInputValue('your_id'),
        offender_id: interaction.fields.getTextInputValue('offender_id'),
        what_happened: interaction.fields.getTextInputValue('what_happened'),
        others_involved: interaction.fields.getTextInputValue('others_involved'),
        evidence: interaction.fields.getTextInputValue('evidence'),
      };

      sessions.set(userId, { type, data });

      const preview = buildPreviewEmbed(type, data, interaction.user);

      await interaction.reply({
        content: '👀 **Preview** — Review your log before posting:',
        embeds: [preview],
        components: [actionRow()],
        ephemeral: true,
      });
      return;
    }

    // ── Edit button clicked ──────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'punish_edit') {
      const session = sessions.get(userId);
      if (!session) return interaction.reply({ content: '⚠️ Session expired. Please run `/punish` again.', ephemeral: true });
      await interaction.showModal(buildModal(session.type, session.data));
      return;
    }

    // ── Confirm button clicked ───────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'punish_confirm') {
      const session = sessions.get(userId);
      if (!session) return interaction.reply({ content: '⚠️ Session expired. Please run `/punish` again.', ephemeral: true });

      try {
        const logChannel = await interaction.guild.channels.fetch(PUNISHMENT_LOG_CHANNEL);
        const finalEmbed = buildPreviewEmbed(session.type, session.data, interaction.user);
        finalEmbed.setFooter({ text: `Logged by ${interaction.user.tag} • ${interaction.user.id}` });
        await logChannel.send({ embeds: [finalEmbed] });
        sessions.delete(userId);
        await interaction.update({
          content: '',
          embeds: [new EmbedBuilder().setColor(0x57F287).setDescription('✅ Punishment log submitted successfully!')],
          components: [],
        });
      } catch (err) {
        console.error('Punishment log failed:', err);
        await interaction.reply({ content: '❌ Failed to submit. Please contact an administrator.', ephemeral: true });
      }
      return;
    }
  },
};
