const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// In-memory storage for tournaments (replace with database in production)
const tournaments = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('signup')
        .setDescription('Sign up for the current tournament'),
    
    async execute(interaction) {
        const tournament = tournaments.get(interaction.guildId);
        if (!tournament) {
            await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
            return;
        }

        if (tournament.participants && tournament.participants.length >= tournament.maxTeams * tournament.game.teamSize) {
            await interaction.reply({ content: 'The tournament is full.', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('signup_modal')
            .setTitle('Tournament Sign Up');

        const teamNameInput = new TextInputBuilder()
            .setCustomId('team_name')
            .setLabel('Team Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(teamNameInput));

        for (let i = 1; i <= tournament.game.teamSize; i++) {
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

    // ... (previous code remains the same)

async handleInteraction(interaction) {
    console.log(`Handling interaction: ${interaction.customId}`);
    try {
        if (interaction.isModalSubmit() && interaction.customId === 'signup_modal') {
            const tournament = tournaments.get(interaction.guildId);
            if (!tournament) {
                console.log('No active tournament found for guild:', interaction.guildId);
                await interaction.reply({ content: 'No active tournament found.', ephemeral: true });
                return;
            }

            const teamName = interaction.fields.getTextInputValue('team_name');
            const players = [];
            for (let i = 1; i <= tournament.game.teamSize; i++) {
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
        } else {
            console.log('Unhandled interaction:', interaction.customId);
            await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error in signup handleInteraction:', error);
        await interaction.reply({ content: 'An error occurred while processing your request.', ephemeral: true });
    }
}