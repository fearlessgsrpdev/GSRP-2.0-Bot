const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || '1493061113259229214';

const MAIN_SERVER_ID = '1491647546387333140';
const SUBDEPT_SERVER_IDS = [
  '1458626277991780434', // DOJ
  '1458632972864454709', // DPS
  '1461148296922796296', // DSO
];

const SKIP_FILES = ['logger.js', 'channelcheck.js', 'globalconfig.js'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

const BAN_HISTORY_FILE = path.join(__dirname, 'banHistory.json');
client.banHistory = fs.existsSync(BAN_HISTORY_FILE)
  ? JSON.parse(fs.readFileSync(BAN_HISTORY_FILE, 'utf8'))
  : {};
client.saveBanHistory = () => {
  fs.writeFileSync(BAN_HISTORY_FILE, JSON.stringify(client.banHistory, null, 2));
};

function loadCommands(folderName) {
  const commands = new Collection();
  const commandsData = [];
  const folderPath = path.join(__dirname, folderName);
  if (!fs.existsSync(folderPath)) return { commands, commandsData };
  const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js') && !SKIP_FILES.includes(f));
  for (const file of files) {
    const command = require(`${folderPath}/${file}`);
    if (command.data) {
      commands.set(command.data.name, command);
      commandsData.push(command.data.toJSON());
    }
  }
  return { commands, commandsData };
}

async function registerCommands(guildId, commandsData) {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commandsData });
    console.log(`✅ Commands registered for guild ${guildId}`);
  } catch (err) {
    console.error(`❌ Failed to register for guild ${guildId}:`, err.message);
  }
}

client.guildCommands = new Map();

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('/help | GSRP Bot');

  const { commands: mainCmds, commandsData: mainData } = loadCommands('commands');
  const { commands: subdeptCmds, commandsData: subdeptData } = loadCommands('commands-subdept');

  client.guildCommands.set(MAIN_SERVER_ID, mainCmds);
  await registerCommands(MAIN_SERVER_ID, mainData);

  for (const guildId of SUBDEPT_SERVER_IDS) {
    client.guildCommands.set(guildId, subdeptCmds);
    await registerCommands(guildId, subdeptData);
  }

  console.log('🔄 All commands registered!');
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isAutocomplete()) {
    const guildCommands = client.guildCommands.get(interaction.guildId);
    const command = guildCommands?.get(interaction.commandName);
    if (command?.autocomplete) {
      try { await command.autocomplete(interaction); } catch (err) { console.error('Autocomplete error:', err); }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const guildCommands = client.guildCommands.get(interaction.guildId);
  const command = guildCommands?.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(err);
    const msg = { content: `❌ Error: \`${err.message}\``, ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

client.login(TOKEN);
