const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ROLE_PERMISSIONS = {
  '1491647546525880480': 'ALL',
  '1491647546387333147': ['1491647546525880481','1491647546525880484','1491647546525880487'],
  '1491647546525880481': ['1491647546525880484','1491647546525880487'],
  '1491647546525880484': ['1491647546525880487'],
  '1491647546525880487': [],
  '1491647546387333148': ['1491647546525880482','1491647546525880485','1491647546525880488','1491647546781597754'],
  '1491647546525880482': ['1491647546525880485','1491647546525880488','1491647546781597754'],
  '1491647546525880485': ['1491647546525880488','1491647546781597754'],
  '1491647546525880488': ['1491647546781597754'],
  '1491647546781597754': [],
};

function getAllowedRoles(member) {
  for (const [roleId, allowed] of Object.entries(ROLE_PERMISSIONS)) {
    if (member.roles.cache.has(roleId)) {
      if (allowed === 'ALL') return 'ALL';
      return allowed;
    }
  }
  return [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleadd')
    .setDescription('Add a role to a member')
    .addUserOption(o => o.setName('user').setDescription('The user to give the role to').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to add').setRequired(true)),

  async execute(interaction) {
    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const allowed = getAllowedRoles(executor);

    if (allowed !== 'ALL' && !allowed.includes(role.id))
      return interaction.reply({ content: `🚫 You don't have permission to assign the **${role.name}** role.`, ephemeral: true });

    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });
    if (target.roles.cache.has(role.id))
      return interaction.reply({ content: `⚠️ ${target.user.tag} already has **${role.name}**.`, ephemeral: true });

    await target.roles.add(role);

    const embed = new EmbedBuilder()
      .setTitle('✅ Role Added')
      .setColor(0x57F287)
      .addFields(
        { name: 'User', value: target.user.tag, inline: true },
        { name: 'Role', value: role.name, inline: true },
        { name: 'Added By', value: executor.user.tag, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
