const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token } = require('./config.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ] 
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.once('ready', () => {
    console.log('Bot is ready!');
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        } else if (interaction.isButton() || interaction.isModalSubmit()) {
            const [action] = interaction.customId.split('_');
            const command = client.commands.get(action) || client.commands.get('create_tournament');
            
            if (command && typeof command.handleInteraction === 'function') {
                await command.handleInteraction(interaction);
            } else {
                console.log(`No handler found for interaction: ${interaction.customId}`);
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        const errorMessage = 'There was an error while executing this command!';
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
        } else {
            await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error);
        }
    }
});

client.login(token);