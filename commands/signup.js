const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
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
            const [action, tournamentId] = interaction.customId.split('_');
            if (action === 'signup') {
                const tournament = Array.from(tournaments.values()).find(t => t.id === tournamentId);
                if (!tournament) {
                    console.log('No active tournament found for ID:', tournamentId);
                    await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
                    return;
                }
                await this.showSignupModal(interaction, tournament);
            } else {
                console.log('Unhandled interaction:', interaction.customId);
                await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
            }
        } catch (error) {
            console.error('Error in signup handleInteraction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `An error occurred while processing your request.`, ephemeral: true });
            }
        }
    },

    async showSignupModal(interaction, tournament) {
        const modal = new ModalBuilder()
            .setCustomId(`signup_modal_${tournament.id}`)
            .setTitle('Tournament Sign Up');

        const teamNameInput = new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(teamNameInput));

        const teamSize = tournament.playersPerTeam || tournament.game.teamSize || 1;
        console.log('Team size:', teamSize);

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
        const [, , tournamentId] = interaction.customId.split('_');
        const tournament = Array.from(tournaments.values()).find(t => t.id === tournamentId);
        if (!tournament) {
            console.log('No active tournament found for ID:', tournamentId);
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        console.log('Tournament found:', tournament);

        const teamName = interaction.fields.getTextInputValue('team_name');
        const players = [];
        const teamSize = Math.min(tournament.playersPerTeam || tournament.game.teamSize || 1, 5);
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

        const participantsList = tournament.participants
            .map((p, index) => `${index + 1}. ${p.teamName}: ${p.players.join(', ')}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Tournament Sign Up Successful')
            .addFields(
                { name: 'Team Name', value: teamName },
                { name: 'Players', value: players.join(', ') },
                { name: 'Current Teams', value: `${tournament.participants.length}/${tournament.maxTeams}` },
                { name: 'All Participants', value: participantsList }
            );

        if (geoGuessrProfile) {
            embed.addFields({ name: 'GeoGuessr Profile', value: geoGuessrProfile });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Update the announcement message with the new participant count
        const announcementChannel = interaction.guild.channels.cache.find(channel => channel.name === 'tournament-announcements');
        if (announcementChannel) {
            const messages = await announcementChannel.messages.fetch({ limit: 10 });
            const lastMessage = messages.find(msg => msg.embeds.length > 0 && msg.embeds[0].title === tournament.title);
            if (lastMessage) {
                const updatedEmbed = EmbedBuilder.from(lastMessage.embeds[0])
                    .setFields(
                        ...lastMessage.embeds[0].fields.filter(field => field.name !== 'Participants' && field.name !== 'All Participants'),
                        { name: 'Participants', value: `${tournament.participants.length}/${tournament.maxTeams}`, inline: true },
                        { name: 'All Participants', value: participantsList }
                    );
                await lastMessage.edit({ embeds: [updatedEmbed] });
            }
        }
    }
};