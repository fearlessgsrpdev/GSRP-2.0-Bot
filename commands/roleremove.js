const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Role hierarchy — maps who can remove what
const ROLE_PERMISSIONS = {
  '1491647546525880480': 'ALL',                  // Management — all perms
  '1491647546387333147': [                        // Staff Manager
    '1491647546525880481',                        // Head Admin
    '1491647546525880484',                        // Sr. Admin
    '1491647546525880487',                        // Admin
  ],
  '1491647546525880481': [                        // Head Admin
    '1491647546525880484',                        // Sr. Admin
    '1491647546525880487',                        // Admin
  ],
  '1491647546525880484': [                        // Sr. Admin
    '1491647546525880487',                        // Admin
  ],
  '1491647546525880487': [],                      // Admin — nothing
  '1491647546387333148': [                        // Major
    '1491647546525880482',                        // Captain
    '1491647546525880485',                        // Lieutenant
    '1491647546525880488',                        // Sergeant
    '1491647546781597754',                        // LEO
  ],
  '1491647546525880482': [                        // Captain
    '1491647546525880485',                        // Lieutenant
    '1491647546525880488',                        // Sergeant
    '1491647546781597754',                        // LEO
  ],
  '1491647546525880485': [                        // Lieutenant
    '1491647546525880488',                        // Sergeant
    '1491647546781597754',                        // LEO
  ],
  '1491647546525880488': [                        // Sergeant
    '1491647546781597754',                        // LEO
  ],
  '1491647546781597754': [],                      // LEO — nothing
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
    .setName('roleremove')
    .setDescription('Remove a role from a member')
    .addUserOption(o => o.setName('user').setDescription('The user to remove the role from').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to remove').setRequired(true)),

  async execute(interaction) {
    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    const allowed = getAllowedRoles(executor);

    if (allowed !== 'ALL' && !allowed.includes(role.id)) {
      return interaction.reply({
        content: `🚫 You don't have permission to remove the **${role.name}** role.`,
        ephemeral: true,
      });
    }

    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });
    if (!target.roles.cache.has(role.id))
      return interaction.reply({ content: `⚠️ ${target.user.tag} doesn't have **${role.name}**.`, ephemeral: true });

    await target.roles.remove(role);

    const embed = new EmbedBuilder()
      .setTitle('❌ Role Removed')
      .setColor(0xED4245)
      .addFields(
        { name: 'User', value: target.user.tag, inline: true },
        { name: 'Role', value: role.name, inline: true },
        { name: 'Removed By', value: executor.user.tag, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
