const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const GAME_PRESETS = {
    VALORANT: { name: "VALORANT", teamSize: 5, emojiId: "1281320366152618045", style: ButtonStyle.Secondary },
    GEOGUESSR: { name: "GeoGuessr", teamSize: 1, emojiId: "1281313927245856798", style: ButtonStyle.Secondary },
    POKÉMON: { name: "Pokémon VGC", teamSize: 1, emojiId: "1281319085183078525", style: ButtonStyle.Secondary },
    PUBG: { name: "PUBG", teamSize: 4, emojiId: "1281320349941629093", style: ButtonStyle.Secondary },
    DEADLOCK: { name: "Deadlock", teamSize: 5, emojiId: "1281321276559982614", style: ButtonStyle.Secondary },
    CS2: { name: "Counter-Strike 2", teamSize: 5, emojiId: "1281321362396287008", style: ButtonStyle.Secondary },
    OTHER: { name: "Other", teamSize: null, emojiId: "1281299007829971094", style: ButtonStyle.Secondary }
};

const TOURNAMENT_MODES = ['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss'];

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
        this.bestOf = 1;
        this.playersPerTeam = game.teamSize;
        this.tournamentMode = 'Single Elimination';
        this.links = '';
        this.restrictedRoles = [];
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
                } else if (interaction.customId === 'create_tournament_advanced') {
                    await this.showAdvancedOptions(interaction);
                }
            } else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'create_tournament_details_modal') {
                    await this.handleTournamentCreation(interaction);
                } else if (interaction.customId === 'create_tournament_advanced_modal') {
                    await this.handleAdvancedOptions(interaction);
                }
            } else if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'tournament_mode_select') {
                    await this.handleTournamentModeSelection(interaction);
                }
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

        const advancedButton = new ButtonBuilder()
            .setCustomId('create_tournament_advanced')
            .setLabel('Advanced Options')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(finalizeButton, advancedButton);

        await interaction.reply({ 
            content: 'Tournament created successfully! Click "Finalize Tournament" to announce it, or "Advanced Options" for more settings.', 
            embeds: [embed], 
            components: [row],
            ephemeral: true
    });
},
    
        async showAdvancedOptions(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('create_tournament_advanced_modal')
            .setTitle('Advanced Tournament Options');

        const bestOfInput = new TextInputBuilder()
            .setCustomId('best_of')
            .setLabel('Best of (e.g., 1, 3, 5)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const playersPerTeamInput = new TextInputBuilder()
            .setCustomId('players_per_team')
            .setLabel('Players per Team')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const linksInput = new TextInputBuilder()
            .setCustomId('links')
            .setLabel('Rules & Logo Links (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Rules: http://example.com/rules\nLogo: http://example.com/logo.png')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(bestOfInput),
            new ActionRowBuilder().addComponents(playersPerTeamInput),
            new ActionRowBuilder().addComponents(linksInput)
        );

        await interaction.showModal(modal);
    },

    async handleAdvancedOptions(interaction) {
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        tournament.bestOf = parseInt(interaction.fields.getTextInputValue('best_of'));
        tournament.playersPerTeam = parseInt(interaction.fields.getTextInputValue('players_per_team'));
        tournament.links = interaction.fields.getTextInputValue('links');

        const modeSelect = new StringSelectMenuBuilder()
            .setCustomId('tournament_mode_select')
            .setPlaceholder('Select tournament mode')
            .addOptions(
                TOURNAMENT_MODES.map(mode => 
                    new StringSelectMenuOptionBuilder()
                        .setLabel(mode)
                        .setValue(mode)
                )
            );

        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId('tournament_role_select')
            .setPlaceholder('Select restricted roles (optional)')
            .setMinValues(0)
            .setMaxValues(interaction.guild.roles.cache.size)
            .addOptions(
                interaction.guild.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .map(role => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(role.name)
                            .setValue(role.id)
                    )
            );

        const modeRow = new ActionRowBuilder().addComponents(modeSelect);
        const roleRow = new ActionRowBuilder().addComponents(roleSelect);

        await interaction.reply({ 
            content: 'Advanced options set. Please select the tournament mode and restricted roles (if any):', 
            components: [modeRow, roleRow],
            ephemeral: true
        });
    },

    async handleTournamentModeSelection(interaction) {
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        tournament.tournamentMode = interaction.values[0];

        // Check if role selection has been made
        if (tournament.restrictedRoles.length > 0) {
            await this.showFinalizationOption(interaction);
        } else {
            await interaction.update({ content: 'Tournament mode set. Please select restricted roles (if any).' });
        }
    },

    async handleRoleSelection(interaction) {
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        tournament.restrictedRoles = interaction.values;

        await this.showFinalizationOption(interaction);
    },

    async showFinalizationOption(interaction) {
        const tournament = tournaments.get(interaction.guildId);

        const finalizeButton = new ButtonBuilder()
            .setCustomId(`create_tournament_finalize_${tournament.id}`)
            .setLabel('Finalize Tournament')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(finalizeButton);

        await interaction.update({ 
            content: 'All options set. Click "Finalize Tournament" to announce it.', 
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
            .setLabel('Sign Up')
            .setStyle(ButtonStyle.Danger);  // Changed to red

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

        const discordTimestamp = `<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:F>`;
        const relativeTime = `<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:R>`;

        const announceEmbed = new EmbedBuilder()
            .setColor('#D9212C')  // GeoGuessr red color
            .setTitle(tournament.title)
            .setDescription(`${tournament.description}\n\n**Date & Time:**\n${discordTimestamp} (${relativeTime})`)
            .addFields(
                { name: 'Bracket', value: 'Single Elimination', inline: true },
                { name: 'Matches', value: 'Best of 1', inline: true },
                { name: 'Team Size', value: tournament.game.teamSize.toString(), inline: true },
                { name: 'Participants', value: `0/${tournament.maxTeams}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },  // Empty field for alignment
                { name: '\u200B', value: '\u200B', inline: true }   // Empty field for alignment
            )
        .addFields(
                { name: 'Tournament Mode', value: tournament.tournamentMode, inline: true },
                { name: 'Best of', value: tournament.bestOf.toString(), inline: true },
                { name: 'Players per Team', value: tournament.playersPerTeam.toString(), inline: true }
            );

        if (tournament.links) {
            const rulesMatch = tournament.links.match(/Rules:\s*(http[s]?:\/\/\S+)/i);
            const logoMatch = tournament.links.match(/Logo:\s*(http[s]?:\/\/\S+)/i);

            if (rulesMatch) {
                announceEmbed.addFields({ name: 'Rules', value: `[View Rules](${rulesMatch[1]})`, inline: true });
            }
            if (logoMatch) {
                announceEmbed.setImage(logoMatch[1]);
            }
        }

        if (tournament.restrictedRoles.length > 0) {
            const roleNames = tournament.restrictedRoles.map(roleId => interaction.guild.roles.cache.get(roleId).name).join(', ');
            announceEmbed.addFields({ name: 'Restricted to Roles', value: roleNames, inline: false });
        }
        
            .setThumbnail(`https://cdn.discordapp.com/emojis/${tournament.game.emojiId}.png`);

        if (tournament.restrictedRoles.length > 0) {
            await announcementChannel.send({ 
                content: `<@&${tournament.restrictedRoles.join('> <@&')}>`,
                embeds: [announceEmbed], 
                components: [playerRow, adminRow]
            });
        } else {
            await announcementChannel.send({ 
                embeds: [announceEmbed], 
                components: [playerRow, adminRow]
            });
        }
        await announcementChannel.send({ 
            embeds: [announceEmbed], 
            components: [playerRow, adminRow]
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