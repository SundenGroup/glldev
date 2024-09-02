// File: commands/signup.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { signupPlayer } = require('../utils/tournament.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Sign up for an active tournament')
    .addStringOption(option => 
      option.setName('tournament')
        .setDescription('The name of the tournament')
        .setRequired(true)),
  async execute(interaction) {
    const tournamentName = interaction.options.getString('tournament');

    try {
      const result = await signupPlayer(tournamentName, interaction.user.id);
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Tournament Sign Up')
        .setDescription(result.message);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: error.message, ephemeral: true });
    }
  },
};