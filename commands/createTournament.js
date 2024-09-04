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

const tournaments = new Map();

class Tournament {
    constructor(title, description, dateTime, maxTeams, game) {
        this.id = Date.now().toString();
        this.title = title;
        this.description = description;
        this.dateTime = dateTime;
        this.maxTeams = maxTeams;
        this.game = game;
        this.participants = [];
        this.isFinalized = false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_tournament')
        .setDescription('Start the process of creating a new tournament'),
    
    tournaments,

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
        try {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('create_tournament_game_')) {
                    await this.handleGameSelection(interaction);
                } else if (interaction.customId.startsWith('create_tournament_finalize_')) {
                    await this.finalizeTournament(interaction);
                }
            } else if (interaction.isModalSubmit() && interaction.customId === 'create_tournament_details_modal') {
                await this.handleTournamentCreation(interaction);
            }
        } catch (error) {
            console.error('Error in create_tournament handleInteraction:', error);
            await this.handleError(interaction, 'An error occurred while processing your request.');
        }
    },

    async handleGameSelection(interaction) {
        try {
            const gameKey = interaction.customId.split('_')[3];
            const game = GAME_PRESETS[gameKey];

            const modal = new ModalBuilder()
                .setCustomId('create_tournament_details_modal')
                .setTitle('Tournament Details');

            const titleInput = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Enter the tournament title')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Enter the tournament description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const dateInput = new TextInputBuilder()
                .setCustomId('date')
                .setLabel('Enter the date (YYYY-MM-DD)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 2023-12-31')
                .setRequired(true);

            const timeInput = new TextInputBuilder()
                .setCustomId('time')
                .setLabel('Enter the time (HH:MM)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g., 14:30')
                .setRequired(true);

            const maxTeamsInput = new TextInputBuilder()
                .setCustomId('max_teams')
                .setLabel('Enter the maximum number of teams')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descriptionInput),
                new ActionRowBuilder().addComponents(dateInput),
                new ActionRowBuilder().addComponents(timeInput),
                new ActionRowBuilder().addComponents(maxTeamsInput)
            );

            tournaments.set(interaction.guildId, { game: game });

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error in handleGameSelection:', error);
            await this.handleError(interaction, 'An error occurred while processing your game selection. Please try again.');
        }
    },

    async handleTournamentCreation(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const title = interaction.fields.getTextInputValue('title');
            const description = interaction.fields.getTextInputValue('description');
            const date = interaction.fields.getTextInputValue('date');
            const time = interaction.fields.getTextInputValue('time');
            const maxTeams = parseInt(interaction.fields.getTextInputValue('max_teams'));
            const dateTime = new Date(`${date}T${time}:00`);

            const tournamentData = tournaments.get(interaction.guildId);
            if (!tournamentData || !tournamentData.game) {
                await interaction.editReply({ content: 'An error occurred: Game not found. Please try creating the tournament again.' });
                return;
            }

            const tournament = new Tournament(title, description, dateTime, maxTeams, tournamentData.game);
            tournaments.set(interaction.guildId, tournament);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Tournament Created')
                .addFields(
                    { name: 'Title', value: tournament.title },
                    { name: 'Description', value: tournament.description },
                    { name: 'Date and Time', value: tournament.dateTime.toISOString() },
                    { name: 'Max Teams', value: tournament.maxTeams.toString() },
                    { name: 'Game', value: tournament.game.name }
                );

            const finalizeButton = new ButtonBuilder()
                .setCustomId(`create_tournament_finalize_${tournament.id}`)
                .setLabel('Finalize Tournament')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(finalizeButton);

            await interaction.editReply({ 
                content: 'Tournament created successfully! Click "Finalize Tournament" to announce it.', 
                embeds: [embed], 
                components: [row],
            });
        } catch (error) {
            console.error('Error in handleTournamentCreation:', error);
            await this.handleError(interaction, 'An error occurred while creating the tournament. Please try again.');
        }
    },

    async finalizeTournament(interaction) {
    console.log('Finalizing tournament');
    try {
        const tournament = Array.from(tournaments.values()).find(t => t.id === interaction.customId.split('_')[3]);
        if (!tournament) {
            await interaction.update({ content: 'No active tournament found.', components: [] });
            return;
        }

        if (tournament.isFinalized) {
            await interaction.update({ content: 'This tournament has already been finalized.', components: [] });
            return;
        }

        const announcementChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tournament-announcements');
        if (!announcementChannel) {
            await interaction.update({ content: 'Tournament announcement channel not found. Please create a #tournament-announcements channel.', components: [] });
            return;
        }

        const signupButton = new ButtonBuilder()
            .setCustomId(`signup_${tournament.id}`)
            .setLabel('Sign Up')
            .setStyle(ButtonStyle.Success);

        const seedButton = new ButtonBuilder()
            .setCustomId(`seed_${tournament.id}`)
            .setLabel('Seed Tournament')
            .setStyle(ButtonStyle.Primary);

        const startButton = new ButtonBuilder()
            .setCustomId(`start_${tournament.id}`)
            .setLabel('Start Tournament')
            .setStyle(ButtonStyle.Primary);

        const playerRow = new ActionRowBuilder().addComponents(signupButton);
        const adminRow = new ActionRowBuilder().addComponents(seedButton, startButton);

        const announceEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(tournament.title)
            .setDescription(tournament.description)
            .addFields(
                { name: 'Date and Time', value: tournament.dateTime.toISOString() },
                { name: 'Game', value: tournament.game.name },
                { name: 'Max Teams', value: tournament.maxTeams.toString() },
                { name: 'Signed Up', value: '0/' + tournament.maxTeams }
            );

        await announcementChannel.send({ 
            embeds: [announceEmbed], 
            components: [playerRow, adminRow]
        });
        
        tournament.isFinalized = true;

        await interaction.update({ content: 'Tournament finalized and announced!', components: [], embeds: [] });
    } catch (error) {
        console.error('Error in finalizeTournament:', error);
        await interaction.update({ content: 'An error occurred while finalizing the tournament. Please try again.', components: [] });
    }
},
    async handleError(interaction, errorMessage) {
        try {
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage, components: [] });
            } else if (interaction.replied) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        } catch (error) {
            console.error('Error in handleError:', error);
        }
    }
};