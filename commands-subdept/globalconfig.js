// Shared config for global ban system
const SERVERS = {
  main: {
    id: '1491647546387333140',
    logChannel: '1491647555895820330',
  },
  doj: {
    id: '1458626277991780434',
    logChannel: '1458632230023987290',
  },
  dps: {
    id: '1458632972864454709',
    logChannel: '1458633610914697266',
  },
  dso: {
    id: '1461148296922796296',
    logChannel: '1461148306745987176',
  },
};

// Head Admin+ roles that can global ban (main server)
const GLOBAL_BAN_ROLES = [
  '1491647546525880480', // Management
  '1491647546387333147', // Staff Manager
  '1491647546525880481', // Head Admin
];

module.exports = { SERVERS, GLOBAL_BAN_ROLES };
