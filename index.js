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
    if (!interaction.isRepliable()) {
        console.log('Interaction is no longer repliable');
        return;
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }).catch(console.error);
            }
        }
    } else if (interaction.isButton()) {
        const [action, tournamentId] = interaction.customId.split('_');
        
        switch(action) {
            case 'signup':
                // Handle signup - call your existing signup logic here
                const signupCommand = client.commands.get('signup');
                if (signupCommand) {
                    await signupCommand.execute(interaction, tournamentId);
                }
                break;
            case 'seed':
                if (interaction.member.permissions.has('ADMINISTRATOR')) {
                    const seedCommand = client.commands.get('seed');
                    if (seedCommand) {
                        await seedCommand.execute(interaction, tournamentId);
                    }
                } else {
                    await interaction.reply({ content: 'Only administrators can seed the tournament.', ephemeral: true });
                }
                break;
            case 'start':
                if (interaction.member.permissions.has('ADMINISTRATOR')) {
                    const startCommand = client.commands.get('start');
                    if (startCommand) {
                        await startCommand.execute(interaction, tournamentId);
                    }
                } else {
                    await interaction.reply({ content: 'Only administrators can start the tournament.', ephemeral: true });
                }
                break;
            default:
                // Handle other button interactions (like those from create_tournament)
                const createTournamentCommand = client.commands.get('create_tournament');
                if (createTournamentCommand && typeof createTournamentCommand.handleInteraction === 'function') {
                    try {
                        await createTournamentCommand.handleInteraction(interaction);
                    } catch (error) {
                        console.error(error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: 'There was an error while processing your interaction!', ephemeral: true }).catch(console.error);
                        }
                    }
                }
                break;
        }
    } else if (interaction.isModalSubmit()) {
        // Handle modal submit interactions (like those from create_tournament)
        const createTournamentCommand = client.commands.get('create_tournament');
        if (createTournamentCommand && typeof createTournamentCommand.handleInteraction === 'function') {
            try {
                await createTournamentCommand.handleInteraction(interaction);
            } catch (error) {
                console.error(error);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'There was an error while processing your interaction!', ephemeral: true }).catch(console.error);
                }
            }
        }
    }
});

client.login(token);