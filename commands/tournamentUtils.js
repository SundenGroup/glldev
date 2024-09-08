const { ButtonStyle, EmbedBuilder } = require('discord.js');

const GAME_PRESETS = {
    VALORANT: { name: "VALORANT", teamSize: 5, emojiId: "1281320366152618045", style: ButtonStyle.Secondary },
    GEOGUESSR: { name: "GeoGuessr", teamSize: 1, emojiId: "1281313927245856798", style: ButtonStyle.Secondary },
    POKÉMON: { name: "Pokémon VGC", teamSize: 1, emojiId: "1281319085183078525", style: ButtonStyle.Secondary },
    PUBG: { name: "PUBG", teamSize: 4, emojiId: "1281320349941629093", style: ButtonStyle.Secondary },
    DEADLOCK: { name: "Deadlock", teamSize: 5, emojiId: "1281321276559982614", style: ButtonStyle.Secondary },
    CS2: { name: "Counter-Strike 2", teamSize: 5, emojiId: "1281321362396287008", style: ButtonStyle.Secondary },
    OTHER: { name: "Other", teamSize: null, emojiId: "1281299007829971094", style: ButtonStyle.Secondary }
};

const TOURNAMENT_MODES = ['Single Elimination', 'Double Elimination', 'Round Robin', 'Swiss'];

function createTournamentEmbed(tournament) {
    const embed = new EmbedBuilder()
        .setColor('#D9212C')
        .setTitle(tournament.title)
        .setDescription(`${tournament.description}\n\n**Date & Time:**\n<t:${Math.floor(tournament.dateTime.getTime() / 1000)}:F>`)
        .addFields(
            { name: 'Tournament Mode', value: tournament.tournamentMode, inline: true },
            { name: 'Best of', value: tournament.bestOf.toString(), inline: true },
            { name: 'Team Size', value: tournament.playersPerTeam.toString(), inline: true },
            { name: 'Participants', value: `${tournament.participants.length}/${tournament.maxTeams}`, inline: true }
        )
        .setThumbnail(`https://cdn.discordapp.com/emojis/${tournament.game.emojiId}.png`);

    if (tournament.rulesLink) {
        embed.addFields({ name: 'Rules', value: `[View Rules](${tournament.rulesLink})`, inline: true });
    }
    
    if (tournament.logoLink) {
        embed.setImage(tournament.logoLink);
    }

    return embed;
}

module.exports = {
    GAME_PRESETS,
    TOURNAMENT_MODES,
    createTournamentEmbed
};