const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Submit a punishment log')
    .addStringOption(o =>
      o.setName('type')
        .setDescription('Punishment type')
        .setRequired(true)
        .addChoices(
          { name: '⚠️ Strike', value: 'Strike' },
          { name: '🚪 Removal without Ban', value: 'Removal without Ban' },
          { name: '🔨 Removal with Ban', value: 'Removal with Ban' },
        )
    ),

  async execute(interaction) {
    if (interaction.channelId !== BOT_COMMANDS_CHANNEL)
      return interaction.reply({ content: `🚫 This command can only be used in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const type = interaction.options.getString('type');

    // Check strike permission
    if (type === 'Strike') {
      const hasRole = STRIKE_ROLES.some(r => interaction.member.roles.cache.has(r));
      if (!hasRole)
        return interaction.reply({ content: '🚫 You do not have permission to issue a **Strike**.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`punish_modal_${type.replace(/ /g, '_')}_${interaction.id}`)
      .setTitle(`📋 Punishment Log — ${type}`);

    const yourId = new TextInputBuilder()
      .setCustomId('your_id')
      .setLabel('Your Discord ID')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 123456789012345678')
      .setRequired(true);

    const offenderId = new TextInputBuilder()
      .setCustomId('offender_id')
      .setLabel("Offender's Discord ID")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. 123456789012345678')
      .setRequired(true);

    const whatHappened = new TextInputBuilder()
      .setCustomId('what_happened')
      .setLabel('What happened?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Describe the incident in detail...')
      .setRequired(true);

    const othersInvolved = new TextInputBuilder()
      .setCustomId('others_involved')
      .setLabel("Others Involved")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Discord IDs or names, or type N/A')
      .setRequired(true);

    const evidence = new TextInputBuilder()
      .setCustomId('evidence')
      .setLabel('Evidence (links/screenshots, or N/A)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Provide links to evidence, or type N/A')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(yourId),
      new ActionRowBuilder().addComponents(offenderId),
      new ActionRowBuilder().addComponents(whatHappened),
      new ActionRowBuilder().addComponents(othersInvolved),
      new ActionRowBuilder().addComponents(evidence),
    );

    await interaction.showModal(modal);

    // Wait for modal submission
    const filter = i => i.customId.startsWith(`punish_modal_${type.replace(/ /g, '_')}_${interaction.id}`);
    const submitted = await interaction.awaitModalSubmit({ filter, time: 10 * 60 * 1000 }).catch(() => null);

    if (!submitted) return;

    const yourDiscordId = submitted.fields.getTextInputValue('your_id');
    const offenderDiscordId = submitted.fields.getTextInputValue('offender_id');
    const whatHappenedValue = submitted.fields.getTextInputValue('what_happened');
    const othersInvolvedValue = submitted.fields.getTextInputValue('others_involved');
    const evidenceValue = submitted.fields.getTextInputValue('evidence');

    const colorMap = {
      'Strike': 0xFF8C00,
      'Removal without Ban': 0xED4245,
      'Removal with Ban': 0x8B0000,
    };

    const emojiMap = {
      'Strike': '⚠️',
      'Removal without Ban': '🚪',
      'Removal with Ban': '🔨',
    };

    const embed = new EmbedBuilder()
      .setTitle(`${emojiMap[type]}  Punishment Log — ${type}`)
      .setColor(colorMap[type])
      .addFields(
        { name: '👮 Submitted By', value: `<@${yourDiscordId}> (\`${yourDiscordId}\`)`, inline: true },
        { name: '🎯 Offender', value: `<@${offenderDiscordId}> (\`${offenderDiscordId}\`)`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📋 Punishment Type', value: `**${type}**`, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📝 What Happened', value: whatHappenedValue },
        { name: '👥 Others Involved', value: othersInvolvedValue },
        { name: '🔗 Evidence', value: evidenceValue },
      )
      .setFooter({ text: `Logged by ${interaction.user.tag} • ${interaction.user.id}` })
      .setTimestamp();

    try {
      const logChannel = await interaction.guild.channels.fetch(PUNISHMENT_LOG_CHANNEL);
      await logChannel.send({ embeds: [embed] });
      await submitted.reply({ content: '✅ Your punishment log has been submitted successfully!', ephemeral: true });
    } catch (err) {
      console.error('Failed to send punishment log:', err);
      await submitted.reply({ content: '❌ Failed to submit the log. Please contact an administrator.', ephemeral: true });
    }
  },
};
