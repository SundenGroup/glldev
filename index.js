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
        } else if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
            const createTournamentCommand = client.commands.get('create_tournament');
            if (createTournamentCommand && typeof createTournamentCommand.handleInteraction === 'function') {
                await createTournamentCommand.handleInteraction(interaction);
            } else {
                // Handle other button interactions (signup, seed, start)
                const [action, tournamentId] = interaction.customId.split('_');
                
                switch(action) {
                    case 'signup':
                        const signupCommand = client.commands.get('signup');
                        if (signupCommand && typeof signupCommand.handleInteraction === 'function') {
                            await signupCommand.handleInteraction(interaction);
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
                            const startTournamentCommand = client.commands.get('start_tournament');
                            if (startTournamentCommand) {
                                await startTournamentCommand.execute(interaction, tournamentId);
                            }
                        } else {
                            await interaction.reply({ content: 'Only administrators can start the tournament.', ephemeral: true });
                        }
                        break;
                    default:
                        console.log(`Unhandled interaction: ${interaction.customId}`);
                        break;
                }
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
        const errorMessage = 'There was an error while executing this command!';
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true }).catch(console.error);
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
        }
    }
});

client.login(token);