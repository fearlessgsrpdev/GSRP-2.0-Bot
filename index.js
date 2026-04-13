const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1493061113259229214';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
  ],
});

// Ban history
const BAN_HISTORY_FILE = path.join(__dirname, 'banHistory.json');
client.banHistory = fs.existsSync(BAN_HISTORY_FILE)
  ? JSON.parse(fs.readFileSync(BAN_HISTORY_FILE, 'utf8'))
  : {};
client.saveBanHistory = () => {
  fs.writeFileSync(BAN_HISTORY_FILE, JSON.stringify(client.banHistory, null, 2));
};

// Load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
const commandsData = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());
}

// Register slash commands with Discord
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsData });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity('/help | Moderation Bot');
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
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
