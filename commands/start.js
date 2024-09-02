// File: commands/start.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { startTournament } = require('../utils/tournament.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start')
    .setDescription('Starts a tournament, generating the initial matchups')
    .addStringOption(option => 
      option.setName('tournament')
        .setDescription('The name of the tournament')
        .setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({ content: 'You need to be an administrator to start a tournament.', ephemeral: true });
      return;
    }

    const tournamentName = interaction.options.getString('tournament');

    try {
      const result = await startTournament(tournamentName);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Tournament Started')
        .setDescription(result.message);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};