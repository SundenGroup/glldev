const axios = require('axios');

class Tournament {
    constructor(title, description, dateTime, maxTeams, seedingMethod = 'manual', logoUrl = null) {
        this.title = title;
        this.description = description;
        this.dateTime = dateTime;
        this.maxTeams = maxTeams;
        this.seedingMethod = seedingMethod;
        this.logoUrl = logoUrl;
        this.teams = [];
    }

    async addTeam(teamName, playerInfo) {
        const team = {
            name: teamName,
            player: {
                discordId: playerInfo.discordId,
                inGameName: playerInfo.inGameName,
                profileLink: playerInfo.profileLink
            }
        };

        if (this.seedingMethod === "automatic" && playerInfo.profileLink) {
            team.player.rating = await this.fetchGeoGuessrRating(playerInfo.profileLink);
        }

        this.teams.push(team);

        if (this.seedingMethod === "automatic") {
            this.teams.sort((a, b) => b.player.rating - a.player.rating);
        }

        return team;
    }

    async fetchGeoGuessrRating(profileLink) {
        const userId = this.extractGeoGuessrUserId(profileLink);
        if (!userId) return 0;

        try {
            const response = await axios.get(`https://www.geoguessr.com/api/v3/users/${userId}`);
            return response.data.totalPoints;
        } catch (error) {
            console.error('Error fetching GeoGuessr rating:', error);
            return 0;
        }
    }

    extractGeoGuessrUserId(profileLink) {
        const match = profileLink.match(/user\/([a-f0-9]+)/i);
        return match ? match[1] : null;
    }
}

module.exports = { Tournament };