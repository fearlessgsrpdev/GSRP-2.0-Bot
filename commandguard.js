const ALLOWED_ROLES = [
  '1491647546525880480', // Management
  '1491647546387333147', // Staff Manager
  '1491647546525880481', // Head Admin
  '1491647546525880484', // Sr. Admin
  '1491647546525880487', // Admin
  '1491647546387333148', // Major
  '1491647546525880482', // Captain
  '1491647546525880485', // Lieutenant
  '1491647546525880488', // Sergeant
];

function hasAccess(member) {
  return ALLOWED_ROLES.some(r => member.roles.cache.has(r));
}

module.exports = { hasAccess };
