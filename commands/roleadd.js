const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { sendLog } = require('./logger');

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

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleadd')
    .setDescription('Add a role to a member')
    .addUserOption(o => o.setName('user').setDescription('The user to give the role to').setRequired(true))
    .addStringOption(o => o.setName('role').setDescription('The role to add (type to search)').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for adding the role').setRequired(false)),

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
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const allowedIds = getAllowedRoleIds(executor);
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) return interaction.reply({ content: '⚠️ Role not found.', ephemeral: true });
    if (allowedIds !== 'ALL' && !allowedIds.includes(role.id))
      return interaction.reply({ content: `🚫 You don't have permission to assign **${role.name}**.`, ephemeral: true });
    if (!target) return interaction.reply({ content: '⚠️ User not found.', ephemeral: true });
    if (target.roles.cache.has(role.id))
      return interaction.reply({ content: `⚠️ ${target.user} already has ${role}.`, ephemeral: true });

    await target.roles.add(role, reason);

    const embed = new EmbedBuilder()
      .setTitle('✅ Role Added')
      .setColor(0x57F287)
      .addFields(
        { name: 'User', value: `${target.user}`, inline: true },
        { name: 'Moderator', value: `${executor.user}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Role Assigned', value: `${role}`, inline: true },
        { name: 'Reason', value: reason, inline: true },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendLog(interaction, [
      { name: 'Action', value: '✅ Role Add', inline: true },
      { name: 'User', value: `${target.user.tag} (${target.user.id})`, inline: true },
      { name: 'Role', value: role.name, inline: true },
      { name: 'Reason', value: reason, inline: true },
    ], 'Moderation Log', 0x57F287);
  },
};
