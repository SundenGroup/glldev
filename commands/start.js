const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tournaments } = require('./createTournament.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Start a tournament')
        .addStringOption(option => 
            option.setName('tournament_id')
                .setDescription('The ID of the tournament')
                .setRequired(true)),

    async execute(interaction, tournamentId = null) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return await interaction.reply({ content: 'You need to be an administrator to use this command.', ephemeral: true });
        }

        tournamentId = tournamentId || interaction.options.getString('tournament_id');

        const tournament = tournaments.get(tournamentId);
        if (!tournament) {
            return await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
        }

        if (tournament.status !== 'CREATED') {
            return await interaction.reply({ content: 'This tournament has already started or ended.', ephemeral: true });
        }

        if (tournament.participants.length < 2) {
            return await interaction.reply({ content: 'Not enough participants to start the tournament.', ephemeral: true });
        }

        tournament.status = 'STARTED';
        // Here you would implement the logic to create initial matchups
        // For simplicity, we'll just acknowledge the tournament has started

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`Tournament Started: ${tournament.title}`)
            .setDescription('The tournament has officially begun!')
            .addFields(
                { name: 'Participants', value: tournament.participants.length.toString() },
                { name: 'Status', value: tournament.status }
            );

        await interaction.reply({ embeds: [embed] });
    },
};