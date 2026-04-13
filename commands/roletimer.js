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

// Parse duration string like "10m", "5h", "2d" into milliseconds
function parseDuration(str) {
  const match = str.match(/^(\d+)(m|h|d)$/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'm') return { ms: amount * 60 * 1000, label: `${amount} minute(s)` };
  if (unit === 'h') return { ms: amount * 60 * 60 * 1000, label: `${amount} hour(s)` };
  if (unit === 'd') return { ms: amount * 24 * 60 * 60 * 1000, label: `${amount} day(s)` };
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roletimer')
    .setDescription('Temporarily assign a role to a member for a set duration')
    .addUserOption(o => o.setName('user').setDescription('The user to give the role to').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('The role to assign').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 5h, 2d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the temp role').setRequired(false)),

  async execute(interaction) {
    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const allowedIds = getAllowedRoleIds(executor);

    // Permission check
    const isAllowed = allowedIds === 'ALL' || allowedIds.includes(role.id);
    if (!isAllowed)
      return interaction.reply({ content: `🚫 You don't have permission to assign **${role.name}**.`, ephemeral: true });

    if (!target)
      return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    // Parse duration
    const duration = parseDuration(durationStr);
    if (!duration)
      return interaction.reply({ content: '⚠️ Invalid duration. Use formats like `10m`, `5h`, or `2d`.', ephemeral: true });

    // Add role
    await target.roles.add(role, reason);

    // Calculate expiry timestamp for Discord's <t:> format
    const expiresAt = Math.floor((Date.now() + duration.ms) / 1000);

    const embed = new EmbedBuilder()
      .setTitle('⏳ Temporary Role Assigned')
      .setColor(0xEB459E)
      .addFields(
        { name: 'User', value: `${target.user}`, inline: true },
        { name: 'Moderator', value: `${executor.user}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Role Assigned', value: `${role}`, inline: true },
        { name: 'Duration', value: duration.label, inline: true },
        { name: 'Expires', value: `<t:${expiresAt}:R>`, inline: true },
        { name: 'Reason', value: reason },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Auto remove after duration
    setTimeout(async () => {
      try {
        const freshMember = await interaction.guild.members.fetch(target.id);
        if (freshMember.roles.cache.has(role.id)) {
          await freshMember.roles.remove(role, 'Temporary role expired');

          const expiredEmbed = new EmbedBuilder()
            .setTitle('⏰ Temporary Role Expired')
            .setColor(0x99AAB5)
            .addFields(
              { name: 'User', value: `${target.user}`, inline: true },
              { name: 'Role Removed', value: `${role}`, inline: true },
            )
            .setTimestamp();

          await interaction.channel.send({ embeds: [expiredEmbed] });
        }
      } catch (err) {
        console.error('Failed to remove temp role:', err);
      }
    }, duration.ms);
  },
};
