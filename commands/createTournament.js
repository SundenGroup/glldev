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

        const modal = new ModalBuilder()
            .setCustomId('create_tournament_modal')
            .setTitle('Create Tournament');

        const gameSelect = new TextInputBuilder()
            .setCustomId('game')
            .setLabel('Game')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., VALORANT, GEOGUESSR, PUBG, etc.')
            .setRequired(true);

        const titleInput = new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Tournament Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Tournament Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const dateTimeInput = new TextInputBuilder()
            .setCustomId('dateTime')
            .setLabel('Date and Time (YYYY-MM-DD HH:MM)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 2023-12-31 14:30')
            .setRequired(true);

        const maxTeamsInput = new TextInputBuilder()
            .setCustomId('maxTeams')
            .setLabel('Maximum Number of Teams')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(gameSelect),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descriptionInput),
            new ActionRowBuilder().addComponents(dateTimeInput),
            new ActionRowBuilder().addComponents(maxTeamsInput)
        );

        await interaction.showModal(modal);
    },

    async handleInteraction(interaction) {
        if (!interaction.isModalSubmit()) return;

        const game = interaction.fields.getTextInputValue('game').toUpperCase();
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const dateTime = new Date(interaction.fields.getTextInputValue('dateTime'));
        const maxTeams = parseInt(interaction.fields.getTextInputValue('maxTeams'));

        if (!GAME_PRESETS[game]) {
            await interaction.reply({ content: 'Invalid game selected. Please try again.', ephemeral: true });
            return;
        }

        const tournament = new Tournament(title, description, dateTime, maxTeams, GAME_PRESETS[game]);
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
            .setCustomId(`finalize_tournament_${tournament.id}`)
            .setLabel('Finalize Tournament')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(finalizeButton);

        await interaction.reply({ 
            content: 'Tournament created successfully! Click "Finalize Tournament" to announce it.', 
            embeds: [embed], 
            components: [row],
            ephemeral: true
        });
    },

    async finalizeTournament(interaction) {
        const tournamentId = interaction.customId.split('_')[2];
        const tournament = tournaments.get(interaction.guildId);

        if (!tournament || tournament.id !== tournamentId) {
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
    }
};