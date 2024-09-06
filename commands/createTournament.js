const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

const GAME_PRESETS = {
    VALORANT: { name: "VALORANT", teamSize: 5, emojiId: "1281320366152618045", style: ButtonStyle.Secondary },
    GEOGUESSR: { name: "GeoGuessr", teamSize: 1, emojiId: "1281313927245856798", style: ButtonStyle.Secondary },
    POKÉMON: { name: "Pokémon VGC", teamSize: 1, emojiId: "1281319085183078525", style: ButtonStyle.Secondary },
    PUBG: { name: "PUBG", teamSize: 4, emojiId: "1281320349941629093", style: ButtonStyle.Secondary },
    DEADLOCK: { name: "Deadlock", teamSize: 5, emojiId: "1281321276559982614", style: ButtonStyle.Secondary },
    CS2: { name: "Counter-Strike 2", teamSize: 5, emojiId: "1281321362396287008", style: ButtonStyle.Secondary },
    OTHER: { name: "Other", teamSize: null, emojiId: "1281299007829971094", style: ButtonStyle.Secondary }
};

const tournaments = new Map();

class Tournament {
    constructor(title, description, dateTime, maxTeams, game, rulesLink, imageUrl) {
        this.id = Date.now().toString();
        this.title = title;
        this.description = description;
        this.dateTime = dateTime;
        this.maxTeams = maxTeams;
        this.game = game;
        this.rulesLink = rulesLink;
        this.imageUrl = imageUrl;
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
            .setEmoji(value.emojiId)
            .setStyle(value.style);
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
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true }).catch(console.error);
            }
        }
    },

    async handleGameSelection(interaction) {
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
        .setLabel('Enter date and time (YYYY-MM-DD HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 2023-12-31 14:30')
        .setRequired(true);

    const maxTeamsInput = new TextInputBuilder()
        .setCustomId('max_teams')
        .setLabel('Enter the maximum number of teams')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const optionalInfoInput = new TextInputBuilder()
        .setCustomId('optional_info')
        .setLabel('Rules Link and Image URL (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Rules: http://example.com/rules\nImage: http://example.com/image.jpg')
        .setRequired(false);

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(dateTimeInput),
        new ActionRowBuilder().addComponents(maxTeamsInput),
        new ActionRowBuilder().addComponents(optionalInfoInput)
    );

    tournaments.set(interaction.guildId, { game: game });

    await interaction.showModal(modal);
},

    async handleTournamentCreation(interaction) {
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const dateTime = new Date(interaction.fields.getTextInputValue('date_time'));
    const maxTeams = parseInt(interaction.fields.getTextInputValue('max_teams'));
    
    const optionalInfo = interaction.fields.getTextInputValue('optional_info');
    let rulesLink = '';
    let imageUrl = '';
    
    if (optionalInfo) {
        const rulesMatch = optionalInfo.match(/Rules:\s*(http[s]?:\/\/\S+)/i);
        const imageMatch = optionalInfo.match(/Image:\s*(http[s]?:\/\/\S+)/i);
        
        if (rulesMatch) rulesLink = rulesMatch[1];
        if (imageMatch) imageUrl = imageMatch[1];
    }

    const tournamentData = tournaments.get(interaction.guildId);
    if (!tournamentData || !tournamentData.game) {
        await interaction.reply({ content: 'An error occurred: Game not found. Please try creating the tournament again.', ephemeral: true });
        return;
    }

    const tournament = new Tournament(title, description, dateTime, maxTeams, tournamentData.game, rulesLink, imageUrl);
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

    if (imageUrl) {
        embed.setImage(imageUrl);
    }

    const finalizeButton = new ButtonBuilder()
        .setCustomId(`create_tournament_finalize_${tournament.id}`)
        .setLabel('Finalize Tournament')
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder()
        .addComponents(finalizeButton);

    await interaction.reply({ 
        content: 'Tournament created successfully! Click "Finalize Tournament" to announce it.', 
        embeds: [embed], 
        components: [row],
        ephemeral: true
    });
},

    async finalizeTournament(interaction) {
    console.log('Finalizing tournament');
    try {
        const tournamentId = interaction.customId.split('_')[3];
        const tournament = tournaments.get(interaction.guildId);

        if (!tournament || tournament.id !== tournamentId) {
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        if (tournament.isFinalized) {
            await interaction.reply({ content: 'This tournament has already been finalized.', ephemeral: true });
            return;
        }

        const announcementChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tournament-announcements');
        if (!announcementChannel) {
            await interaction.reply({ content: 'Tournament announcement channel not found. Please create a #tournament-announcements channel.', ephemeral: true });
            return;
        }

        const signupButton = new ButtonBuilder()
            .setCustomId(`signup_${tournament.id}`)
            .setLabel('Register')
            .setStyle(ButtonStyle.Primary);

        const spectateButton = new ButtonBuilder()
            .setCustomId(`spectate_${tournament.id}`)
            .setLabel('Spectate')
            .setStyle(ButtonStyle.Secondary);

        const viewBracketButton = new ButtonBuilder()
            .setCustomId(`view_bracket_${tournament.id}`)
            .setLabel('View Bracket')
            .setStyle(ButtonStyle.Secondary);

        const playerRow = new ActionRowBuilder().addComponents(signupButton, spectateButton, viewBracketButton);

        const discordTimestamp = `<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:F>`;
        const relativeTime = `<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:R>`;

        const announceEmbed = new EmbedBuilder()
            .setColor('#FFA500')  // Orange color
            .setTitle(tournament.title)
            .setDescription(tournament.description)
            .addFields(
                { name: 'Bracket', value: 'Single Elimination', inline: true },
                { name: 'Status', value: 'Registration Opened', inline: true },
                { name: 'Matches', value: 'Best of 1', inline: true },
                { name: 'Team Size', value: tournament.game.teamSize.toString(), inline: true },
                { name: 'Participants', value: `0/${tournament.maxTeams}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },  // Empty field for alignment
                { name: 'Date and Time', value: `${discordTimestamp} (${relativeTime})` }
            )
            .setThumbnail(`https://cdn.discordapp.com/emojis/${tournament.game.emojiId}.png`)
            .setFooter({ text: 'GLL Tournament Bot', iconURL: 'https://example.com/bot-icon.png' });  // Replace with your bot's icon URL

        await announcementChannel.send({ 
            embeds: [announceEmbed], 
            components: [playerRow]
        });
        
        tournament.isFinalized = true;

        await interaction.reply({ content: 'Tournament finalized and announced!', ephemeral: true });
    } catch (error) {
        console.error('Error in finalizeTournament:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'An error occurred while finalizing the tournament. Please try again.', ephemeral: true });
        }
    }
}
};