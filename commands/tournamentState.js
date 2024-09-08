const tournaments = new Map();

class Tournament {
    constructor(title, description, dateTime, maxTeams, game) {
        this.id = Date.now().toString();
        this.title = title;
        this.description = description;
        this.dateTime = dateTime;
        this.maxTeams = maxTeams;
        this.game = game;
        this.participants = [];
        this.isFinalized = false;
        this.bestOf = 1;
        this.playersPerTeam = game.teamSize;
        this.tournamentMode = 'Single Elimination';
        this.rulesLink = '';
        this.logoLink = '';
        this.restrictedRoles = [];
    }
}

module.exports = { tournaments, Tournament };