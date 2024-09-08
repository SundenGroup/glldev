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
            } else if (interaction.customId === 'create_tournament_modify') {
                await this.showModifyBasicSettings(interaction);
            } else if (interaction.customId === 'create_tournament_confirm_advanced') {
                await this.handleConfirmAdvanced(interaction);
            }
        } else if (interaction.isModalSubmit()) {
            // ... (existing modal submit handling)
        } else if (interaction.isStringSelectMenu()) {
            // ... (existing select menu handling)
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
    },

    async handleTournamentCreation(interaction) {
    try {
        const title = interaction.fields.getTextInputValue('title');
        const description = interaction.fields.getTextInputValue('description');
        const date = interaction.fields.getTextInputValue('date');
        const time = interaction.fields.getTextInputValue('time');
        const maxTeams = parseInt(interaction.fields.getTextInputValue('max_teams'));

        // Validate date and time
        const dateTimeString = `${date}T${time}:00`;
        const dateTime = new Date(dateTimeString);

        if (isNaN(dateTime.getTime())) {
            throw new Error('Invalid date or time format');
        }

        if (isNaN(maxTeams) || maxTeams <= 0) {
            throw new Error('Invalid number of teams');
        }

        const tournamentData = tournaments.get(interaction.guildId);
        if (!tournamentData || !tournamentData.game) {
            throw new Error('Game not found. Please try creating the tournament again.');
        }

        const tournament = new Tournament(title, description, dateTime, maxTeams, tournamentData.game);
        tournaments.set(interaction.guildId, tournament);

        const embed = new EmbedBuilder()
            .setColor('#D9212C')
            .setTitle('Tournament Created')
            .addFields(
                { name: 'Title', value: tournament.title },
                { name: 'Description', value: tournament.description },
                { name: 'Date and Time', value: `<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:F>` },
                { name: 'Max Teams', value: tournament.maxTeams.toString() },
                { name: 'Game', value: tournament.game.name }
            );

        const finalizeButton = new ButtonBuilder()
            .setCustomId(`create_tournament_finalize_${tournament.id}`)
            .setLabel('Finalize Tournament')
            .setStyle(ButtonStyle.Success);

        const advancedButton = new ButtonBuilder()
            .setCustomId('create_tournament_advanced')
            .setLabel('Advanced Options')
            .setStyle(ButtonStyle.Primary);

        const modifyButton = new ButtonBuilder()
            .setCustomId('create_tournament_modify')
            .setLabel('Modify Basic Settings')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder()
            .addComponents(finalizeButton, advancedButton, modifyButton);

        await interaction.reply({ 
            content: 'Tournament created successfully! You can finalize the tournament, set advanced options, or modify basic settings.', 
            embeds: [embed], 
            components: [row],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in handleTournamentCreation:', error);
        await interaction.reply({ 
            content: `An error occurred while creating the tournament: ${error.message}`, 
            ephemeral: true 
        });
    }
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

    const rulesLinkInput = new TextInputBuilder()
        .setCustomId('rules_link')
        .setLabel('Rules Link (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('http://example.com/rules');

    const logoLinkInput = new TextInputBuilder()
        .setCustomId('logo_link')
        .setLabel('Custom Logo Link (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('http://example.com/logo.png');

    modal.addComponents(
        new ActionRowBuilder().addComponents(bestOfInput),
        new ActionRowBuilder().addComponents(playersPerTeamInput),
        new ActionRowBuilder().addComponents(rulesLinkInput),
        new ActionRowBuilder().addComponents(logoLinkInput)
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
    tournament.rulesLink = interaction.fields.getTextInputValue('rules_link');
    tournament.logoLink = interaction.fields.getTextInputValue('logo_link');

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

    const modeRow = new ActionRowBuilder().addComponents(modeSelect);

    const eligibleRoles = interaction.guild.roles.cache
        .filter(role => role.name !== '@everyone' && !role.managed)
        .map(role => ({
            label: role.name,
            value: role.id
        }));

    let components = [modeRow];
    let content = 'Please select the tournament mode and restricted roles (if applicable):';

    if (eligibleRoles.length >= 5) {
        const roleSelect = new StringSelectMenuBuilder()
            .setCustomId('tournament_role_select')
            .setPlaceholder('Select restricted roles (optional)')
            .setMinValues(0)
            .setMaxValues(Math.min(eligibleRoles.length, 25))
            .addOptions(eligibleRoles);

        const roleRow = new ActionRowBuilder().addComponents(roleSelect);
        components.push(roleRow);
    } else {
        content += '\nNote: Role restriction is not available due to insufficient eligible roles.';
    }

    const confirmButton = new ButtonBuilder()
        .setCustomId('create_tournament_confirm_advanced')
        .setLabel('Confirm Settings')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);

    const confirmRow = new ActionRowBuilder().addComponents(confirmButton);
    components.push(confirmRow);

    try {
        await interaction.reply({ 
            content: content, 
            components: components,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error in handleAdvancedOptions:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.followUp({ 
                content: 'An error occurred while processing your request. Please try again.', 
                ephemeral: true 
            });
        }
    }
},

async handleTournamentModeSelection(interaction) {
    const tournament = tournaments.get(interaction.guildId);
    if (!tournament) {
        await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
        return;
    }

    tournament.tournamentMode = interaction.values[0];
    
    // Enable the Confirm button if both selections are made
    if (tournament.restrictedRoles) {
        await this.enableConfirmButton(interaction);
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

    // Enable the Confirm button if both selections are made
    if (tournament.tournamentMode) {
        await this.enableConfirmButton(interaction);
    } else {
        await interaction.update({ content: 'Roles set. Please select the tournament mode.' });
    }
},
    
async enableConfirmButton(interaction) {
    const components = interaction.message.components;
    const confirmRow = components.find(row => row.components[0].customId === 'create_tournament_confirm_advanced');
    confirmRow.components[0].setDisabled(false);

    await interaction.update({ components: components });
},

async handleConfirmAdvanced(interaction) {
    const tournament = tournaments.get(interaction.guildId);
    if (!tournament) {
        await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
        return;
    }

    // Show finalization option
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
                .setStyle(ButtonStyle.Danger);

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
        .setColor('#D9212C')
        .setTitle(tournament.title)
        .setDescription(`${tournament.description}\n\n**Date & Time:**\n${discordTimestamp} (${relativeTime})`)
        .addFields(
            { name: 'Tournament Mode', value: tournament.tournamentMode, inline: true },
            { name: 'Best of', value: tournament.bestOf.toString(), inline: true },
            { name: 'Team Size', value: tournament.playersPerTeam.toString(), inline: true },
            { name: 'Participants', value: `0/${tournament.maxTeams}`, inline: true }
        )
        .setThumbnail(`https://cdn.discordapp.com/emojis/${tournament.game.emojiId}.png`);

    if (tournament.rulesLink) {
        announceEmbed.addFields({ name: 'Rules', value: `[View Rules](${tournament.rulesLink})`, inline: true });
    }
    
    if (tournament.logoLink) {
        announceEmbed.setImage(tournament.logoLink);
    }
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