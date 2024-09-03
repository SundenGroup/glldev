const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Import the tournaments Map from createTournament.js
const { tournaments } = require('./createTournament.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('signup')
        .setDescription('Sign up for the current tournament'),
    
    async execute(interaction) {
        console.log('Executing signup command');
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            console.log('No active tournament found for guild:', interaction.guildId);
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        console.log('Tournament found:', tournament);

        if (tournament.participants && tournament.participants.length >= tournament.maxTeams) {
            await interaction.reply({ content: 'The tournament is full.', ephemeral: true });
            return;
        }

        await this.showSignupModal(interaction, tournament);
    },

    async handleInteraction(interaction) {
        console.log(`Handling interaction: ${interaction.customId}`);
        try {
            if (interaction.isButton() && interaction.customId === 'signup_button') {
                const tournament = tournaments.get(interaction.guildId);
                if (!tournament) {
                    console.log('No active tournament found for guild:', interaction.guildId);
                    await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
                    return;
                }
                await this.showSignupModal(interaction, tournament);
            } else if (interaction.isModalSubmit() && interaction.customId === 'signup_modal') {
                await this.handleSignupSubmit(interaction);
            } else {
                console.log('Unhandled interaction:', interaction.customId);
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in signup handleInteraction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `An error occurred while processing your request: ${error.message}`, ephemeral: true });
            }
        }
    },

    async showSignupModal(interaction, tournament) {
        const modal = new ModalBuilder()
            .setCustomId('signup_modal')
            .setTitle('Tournament Sign Up');

        const teamNameInput = new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(teamNameInput));

        const teamSize = tournament.game.teamSize || 1;
        console.log('Team size:', teamSize);

        // Limit the number of player inputs to 5 (Discord's maximum)
        const playerInputs = Math.min(teamSize, 5);
        for (let i = 1; i <= playerInputs; i++) {
            const playerInput = new TextInputBuilder()
                .setCustomId(`player_${i}`)
                .setLabel(`Player ${i} Name`)
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(playerInput));
        }

        if (tournament.game.name === 'GeoGuessr') {
            const profileLinkInput = new TextInputBuilder()
                .setCustomId('geoguessr_profile')
                .setLabel('GeoGuessr Profile Link')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(profileLinkInput));
        }

        await interaction.showModal(modal);
    },

    async handleSignupSubmit(interaction) {
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            console.log('No active tournament found for guild:', interaction.guildId);
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        console.log('Tournament found:', tournament);

        const teamName = interaction.fields.getTextInputValue('team_name');
        const players = [];
        const teamSize = Math.min(tournament.game.teamSize || 1, 5);
        for (let i = 1; i <= teamSize; i++) {
            players.push(interaction.fields.getTextInputValue(`player_${i}`));
        }

        let geoGuessrProfile = '';
        if (tournament.game.name === 'GeoGuessr') {
            geoGuessrProfile = interaction.fields.getTextInputValue('geoguessr_profile');
        }

        console.log('Signup data:', { teamName, players, geoGuessrProfile });

        if (!tournament.participants) {
            tournament.participants = [];
        }
        tournament.participants.push({ teamName, players, geoGuessrProfile });

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Tournament Sign Up Successful')
            .addFields(
                { name: 'Team Name', value: teamName },
                { name: 'Players', value: players.join(', ') },
                { name: 'Current Teams', value: `${tournament.participants.length}/${tournament.maxTeams}` }
            );

        if (geoGuessrProfile) {
            embed.addFields({ name: 'GeoGuessr Profile', value: geoGuessrProfile });
            // Here you would add the code to fetch and display the GeoGuessr rating
            // For now, we'll just add a placeholder
            embed.addFields({ name: 'GeoGuessr Rating', value: 'Rating will be fetched' });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Update the announcement message with the new participant count
        const announcementChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tournament-announcements');
        if (announcementChannel) {
            const messages = await announcementChannel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();
            if (lastMessage && lastMessage.embeds.length > 0) {
                const updatedEmbed = EmbedBuilder.from(lastMessage.embeds[0])
                    .setFields(
                        ...lastMessage.embeds[0].fields.filter(field => field.name !== 'Signed Up'),
                        { name: 'Signed Up', value: `${tournament.participants.length}/${tournament.maxTeams}` }
                    );
                await lastMessage.edit({ embeds: [updatedEmbed] });
            }
        }
    }
};