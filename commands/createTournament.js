const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const GAME_PRESETS = {
    VALORANT: { name: "VALORANT", teamSize: 5 },
    GEOGUESSR: { name: "GeoGuessr", teamSize: 1 },
    PUBG: { name: "PUBG", teamSize: 4 },
    DEADLOCK: { name: "Deadlock", teamSize: 5 },
    CS2: { name: "Counter-Strike 2", teamSize: 5 },
    SPLITGATE2: { name: "SplitGate 2", teamSize: 3 },
    OTHER: { name: "Other", teamSize: null }
};

// In-memory storage for tournaments (replace with database in production)
const tournaments = new Map();

class Tournament {
    constructor(title, description, dateTime, maxTeams, game) {
        this.title = title;
        this.description = description;
        this.dateTime = dateTime;
        this.maxTeams = maxTeams;
        this.game = game;
        this.participants = [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_tournament')
        .setDescription('Start the process of creating a new tournament'),
    
    tournaments, // Export the tournaments Map

    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You need to be an administrator to create a tournament.', ephemeral: true });
            return;
        }

        const gameButtons = Object.entries(GAME_PRESETS).map(([key, value]) => {
            return new ButtonBuilder()
                .setCustomId(`create_tournament_game_${key}`)
                .setLabel(value.name)
                .setStyle(ButtonStyle.Primary);
        });

        const rows = [];
        for (let i = 0; i < gameButtons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(gameButtons.slice(i, i + 5)));
        }

        await interaction.reply({
            content: 'Select the game for your tournament:',
            components: rows,
            ephemeral: true
        });
    },

    async handleInteraction(interaction) {
        console.log(`Handling interaction: ${interaction.customId}`);
        
        try {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('create_tournament_game_')) {
                    await this.handleGameSelection(interaction);
                } else if (interaction.customId === 'create_tournament_modify') {
                    await interaction.reply({ content: 'Modify tournament feature coming soon!', ephemeral: true });
                } else if (interaction.customId === 'create_tournament_finalize') {
                    await this.finalizeTournament(interaction);
                }
            } else if (interaction.isModalSubmit() && interaction.customId === 'create_tournament_details_modal') {
                await this.handleTournamentCreation(interaction);
            } else {
                console.log('Unhandled interaction:', interaction.customId);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
                }
            }
        } catch (error) {
            console.error('Error in create_tournament handleInteraction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        }
    },

    // ... rest of the file remains the same
};