const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendLog } = require('./logger');
const { canUseCommand, BOT_COMMANDS_CHANNEL } = require('./channelcheck');

const ROLE_PERMISSIONS = {
  // ── Staff ──────────────────────────────────────────────────────────────────
  '1491647546525880480': 'ALL',                   // Management
  '1491647546387333147': [                        // Staff Manager
    '1491647546525880481',                        // Head Admin
    '1491647546525880484',                        // Sr. Admin
    '1491647546525880487',                        // Admin
    // Note: All Car Perms only via /roletimer for Staff Manager
  ],
  '1491647546525880481': [                        // Head Admin
    '1491647546525880484',                        // Sr. Admin
    '1491647546525880487',                        // Admin
  ],
  '1491647546525880484': [                        // Sr. Admin
    '1491647546525880487',                        // Admin
  ],
  '1491647546525880487': [],                      // Admin — nothing
  // ── Police ─────────────────────────────────────────────────────────────────
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

// All Car Perms role — only Management can use roleadd for this
const ALL_CAR_PERMS_ROLE = '1491647546387333147'; // placeholder — replace with actual All Car Perms role ID
const MANAGEMENT_ROLE = '1491647546525880480';

function getAllowedRoleIds(member) {
  let allowed = new Set();
  let isAll = false;
  for (const [roleId, assignable] of Object.entries(ROLE_PERMISSIONS)) {
    if (member.roles.cache.has(roleId)) {
      if (assignable === 'ALL') { isAll = true; break; }
      for (const id of assignable) allowed.add(id);
    }
  }
  if (isAll) return 'ALL';
  return [...allowed];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleadd')
    .setDescription('Add up to 3 roles to a member')
    .addUserOption(o => o.setName('user').setDescription('The user to give the role to').setRequired(true))
    .addStringOption(o => o.setName('role1').setDescription('First role to add').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('role2').setDescription('Second role to add (optional)').setRequired(false).setAutocomplete(true))
    .addStringOption(o => o.setName('role3').setDescription('Third role to add (optional)').setRequired(false).setAutocomplete(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for adding the role(s)').setRequired(false)),

  async autocomplete(interaction) {
    const executor = interaction.member;
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const allowedIds = getAllowedRoleIds(executor);

    let choices;
    if (allowedIds === 'ALL') {
      choices = interaction.guild.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .map(r => ({ name: r.name, value: r.id }));
    } else {
      choices = allowedIds
        .map(id => { const role = interaction.guild.roles.cache.get(id); return role ? { name: role.name, value: role.id } : null; })
        .filter(Boolean);
    }

    await interaction.respond(choices.filter(c => c.name.toLowerCase().includes(focusedValue)).slice(0, 25));
  },

  async execute(interaction) {
    if (!canUseCommand(interaction))
      return interaction.reply({ content: `🚫 You can only use this command in <#${BOT_COMMANDS_CHANNEL}>.`, ephemeral: true });

    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const allowedIds = getAllowedRoleIds(executor);

    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    const roleIds = [
      interaction.options.getString('role1'),
      interaction.options.getString('role2'),
      interaction.options.getString('role3'),
    ].filter(Boolean);

    const rolesAdded = [];
    const errors = [];

    for (const roleId of roleIds) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) { errors.push(`⚠️ One role was not found.`); continue; }
      // Block All Car Perms on roleadd for non-management
      if (role.id === ALL_CAR_PERMS_ROLE && !executor.roles.cache.has(MANAGEMENT_ROLE)) {
        errors.push(`🚫 **${role.name}** can only be given via \`/roletimer\`.`); continue;
      }
      if (allowedIds !== 'ALL' && !allowedIds.includes(role.id)) { errors.push(`🚫 No permission to assign **${role.name}**`); continue; }
      if (target.roles.cache.has(role.id)) { errors.push(`⚠️ ${target.user.username} already has **${role.name}**`); continue; }
      await target.roles.add(role, reason);
      rolesAdded.push(role);
    }

    if (rolesAdded.length === 0)
      return interaction.reply({ content: errors.join('\n') || '❌ No roles were added.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('✅ Role(s) Added')
      .setColor(0x57F287)
      .addFields(
        { name: 'User', value: `${target.user}`, inline: true },
        { name: 'Moderator', value: `${executor.user}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: `Role(s) Assigned (${rolesAdded.length})`, value: rolesAdded.map(r => `${r}`).join('\n'), inline: true },
        { name: 'Reason', value: reason, inline: true },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    if (errors.length > 0) embed.addFields({ name: '⚠️ Skipped', value: errors.join('\n') });

    await interaction.reply({ embeds: [embed] });
    await sendLog(interaction, [
      { name: 'Action', value: '✅ Role Add', inline: true },
      { name: 'User', value: `${target.user.tag} (${target.user.id})`, inline: true },
      { name: 'Role(s)', value: rolesAdded.map(r => r.name).join(', '), inline: true },
      { name: 'Reason', value: reason, inline: true },
    ], 'Moderation Log', 0x57F287);
  },
};
