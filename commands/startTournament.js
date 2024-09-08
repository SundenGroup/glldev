const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { tournaments } = require('./createTournament.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start_tournament')
        .setDescription('Start the tournament and create matchup channels'),

    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({ content: 'You need to be an administrator to start the tournament.', ephemeral: true });
            return;
        }

        const tournament = tournaments.get(interaction.guildId);
        if (!tournament || !tournament.isFinalized) {
            await interaction.reply({ content: 'No finalized tournament found.', ephemeral: true });
            return;
        }

        // Sort participants by seed (assuming participants have a 'seed' property)
        tournament.participants.sort((a, b) => a.seed - b.seed);

        // Create bracket based on tournament mode
        const bracket = this.createBracket(tournament.participants, tournament.tournamentMode);

        // Create matchup channels
        const matchupChannels = await this.createMatchupChannels(interaction.guild, bracket, tournament);

        // Create and send bracket embed
        const bracketEmbed = this.createBracketEmbed(bracket, tournament);
        await interaction.channel.send({ embeds: [bracketEmbed] });

        await interaction.reply({ content: 'Tournament started! Bracket and matchup channels have been created.', ephemeral: true });
    },

    createBracket(participants, mode) {
        switch (mode) {
            case 'Single Elimination':
                return this.createSingleEliminationBracket(participants);
            case 'Double Elimination':
                return this.createDoubleEliminationBracket(participants);
            case 'Round Robin':
                return this.createRoundRobinBracket(participants);
            case 'Swiss':
                return this.createSwissBracket(participants);
            default:
                return this.createSingleEliminationBracket(participants);
        }
    },

    createSingleEliminationBracket(participants) {
        const bracket = [];
        for (let i = 0; i < participants.length; i += 2) {
            bracket.push({
                player1: participants[i],
                player2: participants[i + 1] || { teamName: 'BYE' },
                winner: null
            });
        }
        return bracket;
    },

    createDoubleEliminationBracket(participants) {
        // Implement double elimination bracket
        // This is a placeholder and needs to be implemented
        return this.createSingleEliminationBracket(participants);
    },

    createRoundRobinBracket(participants) {
        const bracket = [];
        for (let i = 0; i < participants.length; i++) {
            for (let j = i + 1; j < participants.length; j++) {
                bracket.push({
                    player1: participants[i],
                    player2: participants[j],
                    winner: null
                });
            }
        }
        return bracket;
    },

    createSwissBracket(participants) {
        // Implement Swiss system bracket
        // This is a placeholder and needs to be implemented
        return this.createSingleEliminationBracket(participants);
    },

    async createMatchupChannels(guild, bracket, tournament) {
        const category = await guild.channels.create({
            name: 'Tournament Matchups',
            type: ChannelType.GuildCategory
        });

        const channels = [];
        for (let i = 0; i < bracket.length; i++) {
            const match = bracket[i];
            const channel = await guild.channels.create({
                name: `match-${i + 1}-${match.player1.teamName}-vs-${match.player2.teamName}`,
                type: ChannelType.GuildText,
                parent: category.id
            });
            channels.push(channel);

            // Send initial message in the channel
            await channel.send(`Match ${i + 1}: ${match.player1.teamName} vs ${match.player2.teamName}\nPlease play your match and report the results here.\nBest of: ${tournament.bestOf}`);
        }

        return channels;
    },

    createBracketEmbed(bracket, tournament) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`Tournament Bracket - ${tournament.title}`)
            .setDescription(`Tournament Mode: ${tournament.tournamentMode}\nBest of: ${tournament.bestOf}`);

        if (tournament.tournamentMode === 'Round Robin') {
            embed.addFields({ name: 'Matches', value: 'All teams will play against each other.' });
        } else {
            bracket.forEach((match, index) => {
                embed.addFields({ name: `Match ${index + 1}`, value: `${match.player1.teamName} vs ${match.player2.teamName}` });
            });
        }

        return embed;
    }
};