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
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        const [action, tournamentId] = interaction.customId.split('_');
        
        switch(action) {
            case 'signup':
                // Handle signup - call your existing signup logic here
                break;
            case 'seed':
                if (interaction.member.permissions.has('ADMINISTRATOR')) {
                    await handleSeedingButton(interaction, tournamentId);
                } else {
                    await interaction.reply({ content: 'Only administrators can seed the tournament.', ephemeral: true });
                }
                break;
            case 'start':
                if (interaction.member.permissions.has('ADMINISTRATOR')) {
                    await handleStartButton(interaction, tournamentId);
                } else {
                    await interaction.reply({ content: 'Only administrators can start the tournament.', ephemeral: true });
                }
                break;
        }
    }
});

async function handleSeedingButton(interaction, tournamentId) {
    const tournamentCommand = client.commands.get('seed');
    if (tournamentCommand) {
        await tournamentCommand.execute(interaction, tournamentId);
    } else {
        await interaction.reply({ content: 'Seeding command not found.', ephemeral: true });
    }
}

async function handleStartButton(interaction, tournamentId) {
    const tournamentCommand = client.commands.get('start');
    if (tournamentCommand) {
        await tournamentCommand.execute(interaction, tournamentId);
    } else {
        await interaction.reply({ content: 'Start command not found.', ephemeral: true });
    }
}

client.login(token);