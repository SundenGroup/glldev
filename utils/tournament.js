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
        this.matches = [];
        this.currentRound = 0;
        this.started = false;
    }

    async addTeam(teamName, playerInfo) {
        if (this.teams.length >= this.maxTeams) {
            throw new Error('Tournament is full');
        }

        const team = {
            name: teamName,
            player: {
                discordId: playerInfo.discordId,
                inGameName: playerInfo.inGameName,
                profileLink: playerInfo.profileLink,
                seed: this.teams.length + 1 // Default seeding
            }
        };

        if (this.seedingMethod === "automatic" && playerInfo.profileLink) {
            team.player.rating = await this.fetchGeoGuessrRating(playerInfo.profileLink);
        }

        this.teams.push(team);

        if (this.seedingMethod === "automatic") {
            this.teams.sort((a, b) => b.player.rating - a.player.rating);
            // Update seeds after sorting
            this.teams.forEach((team, index) => {
                team.player.seed = index + 1;
            });
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

    setSeeding(seedingPairs) {
        try {
            seedingPairs.forEach(([playerName, seed]) => {
                const team = this.teams.find(t => t.player.inGameName === playerName);
                if (team) {
                    team.player.seed = parseInt(seed);
                }
            });
            this.teams.sort((a, b) => a.player.seed - b.player.seed);
            return true;
        } catch (error) {
            console.error('Error setting seeding:', error);
            return false;
        }
    }

    start() {
        if (this.started) {
            return false;
        }
        if (this.teams.length < 2) {
            return false;
        }
        this.started = true;
        this.generateMatches();
        return true;
    }

    generateMatches() {
        this.matches = [];
        for (let i = 0; i < this.teams.length; i += 2) {
            if (i + 1 < this.teams.length) {
                this.matches.push({
                    id: `R${this.currentRound + 1}M${this.matches.length + 1}`,
                    player1: this.teams[i],
                    player2: this.teams[i + 1],
                    winner: null
                });
            } else {
                // If odd number of players, last player gets a bye
                this.matches.push({
                    id: `R${this.currentRound + 1}M${this.matches.length + 1}`,
                    player1: this.teams[i],
                    player2: null,
                    winner: this.teams[i]
                });
            }
        }
    }

    getCurrentRoundMatchups() {
        return this.matches.map(match => 
            `${match.id}: ${match.player1.player.inGameName} vs ${match.player2 ? match.player2.player.inGameName : 'BYE'}`
        ).join('\n');
    }

    reportMatchResult(matchId, winnerName) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) {
            return false;
        }
        
        const winner = match.player1.player.inGameName === winnerName ? match.player1 : match.player2;
        match.winner = winner;

        if (this.isRoundComplete()) {
            this.advanceToNextRound();
        }

        return true;
    }

    isRoundComplete() {
        return this.matches.every(match => match.winner !== null);
    }

    advanceToNextRound() {
        this.currentRound++;
        const winners = this.matches.map(match => match.winner);
        this.teams = winners;
        this.generateMatches();
    }

    getStandings() {
        return this.teams.map((team, index) => ({
            rank: index + 1,
            name: team.player.inGameName,
            seed: team.player.seed,
            rating: team.player.rating
        }));
    }
}

module.exports = { Tournament };