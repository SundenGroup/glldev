// File: commands/report.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { reportMatch } = require('../utils/tournament.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report the result of a match')
    .addStringOption(option => 
      option.setName('tournament')
        .setDescription('The name of the tournament')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('match_id')
        .setDescription('The ID of the match')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('winner')
        .setDescription('The winner of the match')
        .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({ content: 'You need to be an administrator to report match results.', ephemeral: true });
      return;
    }

    const tournamentName = interaction.options.getString('tournament');
    const matchId = interaction.options.getString('match_id');
    const winner = interaction.options.getString('winner');

    try {
      const result = await reportMatch(tournamentName, matchId, winner);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Match Result Reported')
        .setDescription(result.message);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};