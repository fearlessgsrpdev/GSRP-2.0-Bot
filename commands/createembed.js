const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const MANAGEMENT_ROLE = '1491647546525880480';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('createembed')
    .setDescription('Create a professional embed message')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to post the embed in').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Main body text (use \\n for new lines)').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #FF5733 (default: #5865F2)').setRequired(false))
    .addStringOption(o => o.setName('thumbnail').setDescription('URL of thumbnail image (top right)').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('URL of large image (bottom of embed)').setRequired(false))
    .addStringOption(o => o.setName('footer').setDescription('Footer text').setRequired(false))
    .addStringOption(o => o.setName('fields').setDescription('Fields in format: Name|Value|inline, Name2|Value2|inline (separate with ;;)').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MANAGEMENT_ROLE))
      return interaction.reply({ content: '🚫 Only **Management** can use this command.', ephemeral: true });

    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description').replace(/\\n/g, '\n');
    const colorInput = interaction.options.getString('color') || '#5865F2';
    const thumbnail = interaction.options.getString('thumbnail');
    const image = interaction.options.getString('image');
    const footer = interaction.options.getString('footer');
    const fieldsInput = interaction.options.getString('fields');

    // Parse color
    const color = parseInt(colorInput.replace('#', ''), 16) || 0x5865F2;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (footer) embed.setFooter({ text: footer });

    // Parse fields: "Name|Value|true ;; Name2|Value2|false"
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
    }

    const sent = await channel.send({ embeds: [embed] });

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setDescription(`✅ Embed posted in ${channel}!\n📋 **Message ID:** \`${sent.id}\`\n*Save this ID if you want to edit or delete it later.*`)
      ],
      ephemeral: true
    });
  },
};
