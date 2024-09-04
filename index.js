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
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'create_tournament_modal') {
                const command = client.commands.get('create_tournament');
                if (command && typeof command.handleInteraction === 'function') {
                    await command.handleInteraction(interaction);
                }
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('finalize_tournament_')) {
                const command = client.commands.get('create_tournament');
                if (command && typeof command.finalizeTournament === 'function') {
                    await command.finalizeTournament(interaction);
                }
            }
            // Handle other button interactions here (signup, seed, start)
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } catch (replyError) {
            console.error('Error while replying to interaction:', replyError);
        }
    }
});

client.login(token);