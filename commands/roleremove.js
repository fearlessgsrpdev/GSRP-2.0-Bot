const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ROLE_PERMISSIONS = {
  // ── Staff ──────────────────────────────────────────────────────────────────
  '1493064221724905502': 'ALL',                   // Management
  '1493064273532817509': [                        // Staff Manager
    '1493064191207018648',                        // Head Admin
    '1493064154959843378',                        // Sr. Admin
    '1493064095237148812',                        // Admin
  ],
  '1493064191207018648': [                        // Head Admin
    '1493064154959843378',                        // Sr. Admin
    '1493064095237148812',                        // Admin
  ],
  '1493064154959843378': [                        // Sr. Admin
    '1493064095237148812',                        // Admin
  ],
  '1493064095237148812': [],                      // Admin — nothing

  // ── Police ─────────────────────────────────────────────────────────────────
  '1493078620321878168': [                        // Major
    '1493078617687851158',                        // Captain
    '1493078611308187699',                        // Lieutenant
    '1493078620703297586',                        // Sergeant
    '1493078621781364836',                        // LEO
  ],
  '1493078617687851158': [                        // Captain
    '1493078611308187699',                        // Lieutenant
    '1493078620703297586',                        // Sergeant
    '1493078621781364836',                        // LEO
  ],
  '1493078611308187699': [                        // Lieutenant
    '1493078620703297586',                        // Sergeant
    '1493078621781364836',                        // LEO
  ],
  '1493078620703297586': [                        // Sergeant
    '1493078621781364836',                        // LEO
  ],
  '1493078621781364836': [],                      // LEO — nothing
};

function getAllowedRoleIds(member) {
  for (const [roleId, allowed] of Object.entries(ROLE_PERMISSIONS)) {
    if (member.roles.cache.has(roleId)) {
      if (allowed === 'ALL') return Object.keys(ROLE_PERMISSIONS).filter(id => id !== roleId);
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
    .addRoleOption(o => o.setName('role').setDescription('The role to remove').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for removing the role').setRequired(false)),

  async execute(interaction) {
    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const allowedIds = getAllowedRoleIds(executor);

    const isAllowed = allowedIds === 'ALL' || allowedIds.includes(role.id);
    if (!isAllowed)
      return interaction.reply({ content: `🚫 You don't have permission to remove **${role.name}**.`, ephemeral: true });

    if (!target)
      return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    if (!target.roles.cache.has(role.id))
      return interaction.reply({ content: `⚠️ ${target.user} doesn't have ${role}.`, ephemeral: true });

    await target.roles.remove(role, reason);

    const embed = new EmbedBuilder()
      .setTitle('❌ Role Removed')
      .setColor(0xED4245)
      .addFields(
        { name: 'User', value: `${target.user}`, inline: true },
        { name: 'Moderator', value: `${executor.user}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Role Removed', value: `${role}`, inline: true },
        { name: 'Reason', value: reason, inline: true },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
