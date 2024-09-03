const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`${client.user.tag} is online! GLL by Clutch`);
  client.user.setActivity('GLL by Clutch | /help');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isButton() && !interaction.isModalSubmit()) return;

  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  } else if (interaction.isButton() || interaction.isModalSubmit()) {
    // Handle button interactions and modal submits in their respective command files
    const customId = interaction.customId.split('_')[0];
    const command = client.commands.get(customId);
    if (command && typeof command.handleInteraction === 'function') {
      try {
        await command.handleInteraction(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error processing your interaction!', ephemeral: true });
      }
    }
  }
});

client.login(token);