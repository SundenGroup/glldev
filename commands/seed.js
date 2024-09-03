const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tournaments } = require('./createTournament.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seed')
        .setDescription('Set or adjust seedings for a tournament')
        .addStringOption(option => 
            option.setName('tournament_id')
                .setDescription('The ID of the tournament')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('seedings')
                .setDescription('Seedings in format: "player1,seed1;player2,seed2;..."')
                .setRequired(true)),

    async execute(interaction, tournamentId = null) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return await interaction.reply({ content: 'You need to be an administrator to use this command.', ephemeral: true });
        }

        tournamentId = tournamentId || interaction.options.getString('tournament_id');
        const seedingsInput = interaction.options.getString('seedings');

        const tournament = tournaments.get(tournamentId);
        if (!tournament) {
            return await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
        }

        if (tournament.status !== 'CREATED') {
            return await interaction.reply({ content: 'Cannot seed a tournament that has already started.', ephemeral: true });
        }

        const seedings = seedingsInput.split(';').map(pair => pair.split(','));
        const seedingMap = new Map(seedings);

        tournament.participants.forEach(participant => {
            const seed = seedingMap.get(participant.name);
            if (seed) {
                participant.seed = parseInt(seed);
            }
        });

        tournament.participants.sort((a, b) => a.seed - b.seed);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`Tournament Seedings: ${tournament.title}`)
            .setDescription('Seedings have been updated.')
            .addFields(
                tournament.participants.map(p => ({ name: `Seed ${p.seed}`, value: p.name }))
            );

        await interaction.reply({ embeds: [embed] });
    },
};