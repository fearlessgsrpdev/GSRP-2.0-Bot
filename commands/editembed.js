const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MANAGEMENT_ROLE = '1491647546525880480';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editembed')
    .setDescription('Edit an existing embed message')
    .addStringOption(o => o.setName('messageid').setDescription('ID of the message to edit').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel the message is in').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('New title (leave blank to keep current)').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('New description (use \\n for new lines)').setRequired(false))
    .addStringOption(o => o.setName('color').setDescription('New hex color e.g. #FF5733').setRequired(false))
    .addStringOption(o => o.setName('thumbnail').setDescription('New thumbnail URL').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('New large image URL').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('New footer text').setRequired(false))
    .addStringOption(o => o.setName('fields').setDescription('Replace all fields: Name|Value|inline ;; Name2|Value2|inline').setRequired(false)),

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

    if (!message.author.bot || message.embeds.length === 0)
      return interaction.reply({ content: '❌ That message is not a bot embed.', ephemeral: true });

    const existing = message.embeds[0];
    const titleInput = interaction.options.getString('title');
    const descInput = interaction.options.getString('description');
    const colorInput = interaction.options.getString('color');
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const footer = interaction.options.getString('footer');
    const fieldsInput = interaction.options.getString('fields');

    const embed = new EmbedBuilder()
      .setTitle(titleInput || existing.title || null)
      .setDescription(descInput ? descInput.replace(/\\n/g, '\n') : (existing.description || null))
      .setColor(colorInput ? parseInt(colorInput.replace('#', ''), 16) : (existing.color || 0x5865F2))
      .setTimestamp();

    // Keep existing thumbnail/image/footer unless overridden
    const thumbUrl = thumbnail || existing.thumbnail?.url || null;
    const imageUrl = image || existing.image?.url || null;
    const footerText = footer || existing.footer?.text || null;

    if (thumbUrl) embed.setThumbnail(thumbUrl);
    if (imageUrl) embed.setImage(imageUrl);
    if (footerText) embed.setFooter({ text: footerText });

    // Fields — replace if provided, otherwise keep existing
    if (fieldsInput) {
      const fields = fieldsInput.split(';;').map(f => {
        const parts = f.trim().split('|');
        return {
          name: parts[0]?.trim() || '\u200B',
          value: parts[1]?.trim() || '\u200B',
          inline: parts[2]?.trim().toLowerCase() === 'true',
        };
      });
      embed.addFields(fields);
    } else if (existing.fields?.length > 0) {
      embed.addFields(existing.fields.map(f => ({ name: f.name, value: f.value, inline: f.inline })));
    }

    await message.edit({ embeds: [embed] });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setDescription(`✅ Embed updated successfully in ${channel}!`)
      ],
      ephemeral: true
    });
  },
};
