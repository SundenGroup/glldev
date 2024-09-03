const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { tournaments } = require('./createTournament.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seed')
        .setDescription('Set or adjust seedings for a tournament')
        .addStringOption(option => 
            option.setName('seedings')
                .setDescription('Seedings in format: "player1,seed1;player2,seed2;..."')
                .setRequired(true)),

    async execute(interaction, tournamentId = null) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return await interaction.reply({ content: 'You need to be an administrator to use this command.', ephemeral: true });
        }

        let tournament;
        if (tournamentId) {
            tournament = Array.from(tournaments.values()).find(t => t.id === tournamentId);
        } else {
            tournament = tournaments.get(interaction.guildId);
        }

        if (!tournament) {
            return await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
        }

        if (tournament.status !== 'CREATED') {
            return await interaction.reply({ content: 'Cannot seed a tournament that has already started.', ephemeral: true });
        }

        let seedingsInput;
        if (interaction.options) {
            seedingsInput = interaction.options.getString('seedings');
        } else {
            // For button interactions, we need to show a modal to get the seedings
            return await this.showSeedingModal(interaction, tournament);
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

    async showSeedingModal(interaction, tournament) {
        const modal = new ModalBuilder()
            .setCustomId(`seeding_modal_${tournament.id}`)
            .setTitle('Tournament Seeding');

        const seedingsInput = new TextInputBuilder()
            .setCustomId('seedings')
            .setLabel('Enter seedings (player1,seed1;player2,seed2;...)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(seedingsInput));

        await interaction.showModal(modal);
    },

    async handleSeedingModalSubmit(interaction) {
        const [, , tournamentId] = interaction.customId.split('_');
        const tournament = Array.from(tournaments.values()).find(t => t.id === tournamentId);

        if (!tournament) {
            return await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
        }

        const seedingsInput = interaction.fields.getTextInputValue('seedings');
        await this.execute(interaction, tournamentId);
    }
};