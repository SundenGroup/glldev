// File: commands/createTournament.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createTournament } = require('../utils/tournament.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('create_tournament')
    .setDescription('Start the process of creating a new tournament'),
  async execute(interaction) {
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      await interaction.reply({ content: 'You need to be an administrator to create a tournament.', ephemeral: true });
      return;
    }

    // Start the tournament creation process
    const tournament = createTournament(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Tournament Creation')
      .setDescription('Let\'s set up your tournament! First, choose a game:');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('game_geoguessr')
          .setLabel('GeoGuessr')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('game_valorant')
          .setLabel('VALORANT')
          .setStyle(ButtonStyle.Primary),
        // Add more game options here
      );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
