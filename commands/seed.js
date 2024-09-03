const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Assume you have a way to store and retrieve tournaments, e.g., a Map or database
const tournaments = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seed')
        .setDescription('Manually set or adjust seedings for a tournament')
        .addStringOption(option => 
            option.setName('tournament')
                .setDescription('The name of the tournament')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You need to be an administrator to seed a tournament.', ephemeral: true });
            return;
        }

        const tournamentName = interaction.options.getString('tournament');
        const tournament = tournaments.get(tournamentName);

        if (!tournament) {
            await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId('seed_modal')
            .setTitle('Tournament Seeding');

        const seedingInput = new TextInputBuilder()
            .setCustomId('seeding')
            .setLabel('Enter seedings (player1,seed1;player2,seed2;...)')
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(new ActionRowBuilder().addComponents(seedingInput));

        await interaction.showModal(modal);
    },
    async handleInteraction(interaction) {
        if (interaction.isModalSubmit() && interaction.customId === 'seed_modal') {
            const tournamentName = interaction.options.getString('tournament');
            const tournament = tournaments.get(tournamentName);
            const seedingInput = interaction.fields.getTextInputValue('seeding');

            const seedingPairs = seedingInput.split(';').map(pair => pair.split(','));
            const seedingSuccess = tournament.setSeeding(seedingPairs);

            if (seedingSuccess) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Tournament Seeding Updated')
                    .setDescription(`Seeding for ${tournamentName} has been updated successfully.`);

                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({ content: 'There was an error updating the seeding. Please check your input and try again.', ephemeral: true });
            }
        }
    }
};