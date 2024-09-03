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
  try {
    if (interaction.isCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
    } else if (interaction.isButton() || interaction.isModalSubmit()) {
      let commandName;
      if (interaction.isButton()) {
        commandName = interaction.customId.split('_')[0] + '_' + interaction.customId.split('_')[1];
      } else if (interaction.isModalSubmit()) {
        commandName = interaction.customId.split('_')[0] + '_' + interaction.customId.split('_')[1];
      }
      
      console.log(`Attempting to handle interaction for command: ${commandName}`);
      const command = client.commands.get(commandName);

      if (command && typeof command.handleInteraction === 'function') {
        await command.handleInteraction(interaction);
      } else {
        console.log(`No handler found for interaction: ${interaction.customId}`);
        await interaction.reply({ content: 'This interaction is not currently handled.', ephemeral: true });
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    const replyContent = { content: 'There was an error while processing this interaction!', ephemeral: true };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(replyContent).catch(console.error);
    } else {
      await interaction.reply(replyContent).catch(console.error);
    }
  }
});

client.login(token);