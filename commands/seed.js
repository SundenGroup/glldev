// File: commands/seed.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { seedTournament } = require('../utils/tournament.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seed')
    .setDescription('Manually set or adjust seedings for a tournament')
    .addStringOption(option => 
      option.setName('tournament')
        .setDescription('The name of the tournament')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('seedings')
        .setDescription('The seedings in format: "player1,seed1;player2,seed2;..."')
        .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({ content: 'You need to be an administrator to seed a tournament.', ephemeral: true });
      return;
    }

    const tournamentName = interaction.options.getString('tournament');
    const seedings = interaction.options.getString('seedings');

    try {
      const result = await seedTournament(tournamentName, seedings);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Tournament Seeding')
        .setDescription(result.message);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};
