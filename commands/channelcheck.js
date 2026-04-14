const BOT_COMMANDS_CHANNEL = '1491647555287912522';
const MANAGEMENT_ROLE = '1491647546525880480';
const STAFF_MANAGER_ROLE = '1491647546387333147';

// Returns true if the member can use commands in this channel
function canUseCommand(interaction) {
  const member = interaction.member;
  const channelId = interaction.channelId;

  const isManagement = member.roles.cache.has(MANAGEMENT_ROLE);
  const isStaffManager = member.roles.cache.has(STAFF_MANAGER_ROLE);

  // Management and Staff Manager can use commands anywhere
  if (isManagement || isStaffManager) return true;

  // Everyone else must be in bot-commands channel
  if (channelId === BOT_COMMANDS_CHANNEL) return true;

  return false;
}

module.exports = { canUseCommand, BOT_COMMANDS_CHANNEL };
