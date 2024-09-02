// File: commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows information about GLL bot commands'),
  async execute(interaction) {
    const isAdmin = interaction.member.permissions.has('ADMINISTRATOR');

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('GLL Bot Help')
      .setDescription('GLL by Clutch - Tournament Management Bot')
      .setThumbnail(interaction.client.user.displayAvatarURL());

    if (isAdmin) {
      embed.addFields(
        { name: 'Admin Commands', value: 'Here are the commands available to administrators:' },
        { name: '/create_tournament', value: 'Initiates the tournament creation process.' },
        { name: '/seed', value: 'Manually set or adjust seedings for a tournament.' },
        { name: '/start', value: 'Starts a tournament, generating the initial matchups.' },
        { name: '/report', value: 'Report the result of a match.' }
      );
    }

    embed.addFields(
      { name: 'Player Commands', value: 'Here are the commands available to all players:' },
      { name: '/signup', value: 'Sign up for an active tournament.' }
    );

    embed.setFooter({ text: 'For more detailed information, contact a server administrator.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};