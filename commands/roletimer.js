const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const ROLE_PERMISSIONS = {
  '1493064221724905502': 'ALL',
  '1493064273532817509': ['1493064191207018648','1493064154959843378','1493064095237148812'],
  '1493064191207018648': ['1493064154959843378','1493064095237148812'],
  '1493064154959843378': ['1493064095237148812'],
  '1493064095237148812': [],
  '1493078620321878168': ['1493078617687851158','1493078611308187699','1493078620703297586','1493078621781364836'],
  '1493078617687851158': ['1493078611308187699','1493078620703297586','1493078621781364836'],
  '1493078611308187699': ['1493078620703297586','1493078621781364836'],
  '1493078620703297586': ['1493078621781364836'],
  '1493078621781364836': [],
};

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
    .setDescription('Temporarily assign a role for a set duration')
    .addUserOption(o => o.setName('user').setDescription('The user to give the role to').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('The role to assign (type to search)').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 5h, 2d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the temp role').setRequired(false)),

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
    const executor = interaction.member;
    const target = interaction.options.getMember('user');
    const roleId = interaction.options.getString('role');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const allowedIds = getAllowedRoleIds(executor);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) return interaction.reply({ content: '⚠️ Role not found.', ephemeral: true });
    if (allowedIds !== 'ALL' && !allowedIds.includes(role.id))
      return interaction.reply({ content: `🚫 You don't have permission to assign **${role.name}**.`, ephemeral: true });
    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });

    const duration = parseDuration(durationStr);
    if (!duration)
      return interaction.reply({ content: '⚠️ Invalid duration. Use `10m`, `5h`, or `2d`.', ephemeral: true });

    await target.roles.add(role, reason);
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
