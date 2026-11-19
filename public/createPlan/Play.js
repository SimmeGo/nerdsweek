export class Play {

    constructor(id, playedGame, timeslot, timeslotCount, players, duration, winner) {

        this.id = id;
        this.playedGame = playedGame;
        this.timeslot = timeslot;
        this.timeslotCount = timeslotCount;
        this.players = players;
        this.duration = duration;
        this.winner = winner;
        this.validPlayerCount = false;
    }

    calculateScore() { }

    isValidPlayerCount(game) {
        return (
            this.players.length >= game.playerCount.min &&
            this.players.length <= game.playerCount.max &&
            !game.playerCount.excluded.includes(this.players.length)
        );
    }

    isPerfectPlayerCount(game) {
        return (
            game.playerCount.preferred.includes(this.players.length)
        );
    }

    clone() {
        const copy = new Play(this.id);
        copy.players = structuredClone(this.players);
        copy.timeslot = structuredClone(this.timeslot);
        return copy;
    }
}
