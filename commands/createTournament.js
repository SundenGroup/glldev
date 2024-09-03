const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Tournament } = require('../utils/tournament.js');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create_tournament')
        .setDescription('Start the process of creating a new tournament'),
    
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
        if (interaction.isButton() && interaction.customId.startsWith('create_tournament_game_')) {
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

            const dateTimeInput = new TextInputBuilder()
                .setCustomId('date_time')
                .setLabel('Enter the date and time (YYYY-MM-DD HH:MM)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const maxTeamsInput = new TextInputBuilder()
                .setCustomId('max_teams')
                .setLabel('Enter the maximum number of teams')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descriptionInput),
                new ActionRowBuilder().addComponents(dateTimeInput),
                new ActionRowBuilder().addComponents(maxTeamsInput)
            );

            await interaction.showModal(modal);
        } else if (interaction.isModalSubmit() && interaction.customId === 'create_tournament_details_modal') {
            const title = interaction.fields.getTextInputValue('title');
            const description = interaction.fields.getTextInputValue('description');
            const dateTime = interaction.fields.getTextInputValue('date_time');
            const maxTeams = parseInt(interaction.fields.getTextInputValue('max_teams'));

            const tournament = new Tournament(title, description, new Date(dateTime), maxTeams, GAME_PRESETS[gameKey]);
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

            const modifyButton = new ButtonBuilder()
                .setCustomId('modify_tournament')
                .setLabel('Modify Settings')
                .setStyle(ButtonStyle.Primary);

            const finalizeButton = new ButtonBuilder()
                .setCustomId('finalize_tournament')
                .setLabel('Finalize Tournament')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(modifyButton, finalizeButton);

            await interaction.reply({ 
                content: 'Tournament created successfully!', 
                embeds: [embed], 
                components: [row],
                ephemeral: false 
            });
        } else if (interaction.isButton() && interaction.customId === 'modify_tournament') {
            // Implement modify tournament logic here
            await interaction.reply({ content: 'Modify tournament feature coming soon!', ephemeral: true });
        } else if (interaction.isButton() && interaction.customId === 'finalize_tournament') {
            const tournament = tournaments.get(interaction.guildId);
            if (!tournament) {
                await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
                return;
            }

            const announcementChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tournament-announcements');
            if (!announcementChannel) {
                await interaction.reply({ content: 'Tournament announcement channel not found. Please create a #tournament-announcements channel.', ephemeral: true });
                return;
            }

            const signupButton = new ButtonBuilder()
                .setCustomId('tournament_signup')
                .setLabel('Sign Up')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(signupButton);

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

            await announcementChannel.send({ embeds: [announceEmbed], components: [row] });
            await interaction.reply({ content: 'Tournament finalized and announced!', ephemeral: true });
        }
    }
};