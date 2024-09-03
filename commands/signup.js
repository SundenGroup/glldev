const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { Tournament } = require('../utils/tournament.js');

// Assume you have a way to store and retrieve tournaments, e.g., a Map or database
const tournaments = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('signup')
        .setDescription('Sign up for a tournament')
        .addStringOption(option => 
            option.setName('tournament')
                .setDescription('The name of the tournament')
                .setRequired(true)),
    async execute(interaction) {
        const tournamentName = interaction.options.getString('tournament');
        const tournament = tournaments.get(tournamentName);

        if (!tournament) {
            await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
            return;
        }

        if (tournament.teams.length >= tournament.maxTeams) {
            await interaction.reply({ content: 'The tournament is full.', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('signup_modal')
            .setTitle('Tournament Sign Up');

        const inGameNameInput = new TextInputBuilder()
            .setCustomId('in_game_name')
            .setLabel("Your In-Game Name")
            .setStyle(TextInputStyle.Short);

        const profileLinkInput = new TextInputBuilder()
            .setCustomId('profile_link')
            .setLabel("Your GeoGuessr Profile Link (if applicable)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inGameNameInput),
            new ActionRowBuilder().addComponents(profileLinkInput)
        );

        await interaction.showModal(modal);
    },
    async handleInteraction(interaction) {
        if (interaction.isModalSubmit() && interaction.customId === 'signup_modal') {
            const tournamentName = interaction.options.getString('tournament');
            const tournament = tournaments.get(tournamentName);

            const inGameName = interaction.fields.getTextInputValue('in_game_name');
            const profileLink = interaction.fields.getTextInputValue('profile_link');

            const playerInfo = {
                discordId: interaction.user.id,
                inGameName: inGameName,
                profileLink: profileLink
            };

            try {
                const team = await tournament.addTeam(inGameName, playerInfo);
                
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Tournament Sign Up Successful')
                    .addFields(
                        { name: 'Player', value: `<@${interaction.user.id}> (${inGameName})` },
                        { name: 'Tournament', value: tournament.title },
                        { name: 'Current Players', value: `${tournament.teams.length}/${tournament.maxTeams}` }
                    );

                if (team.player.rating) {
                    embed.addFields({ name: 'Rating', value: team.player.rating.toString() });
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                await interaction.reply({ content: 'There was an error processing your signup. Please try again.', ephemeral: true });
            }
        }
    }
};