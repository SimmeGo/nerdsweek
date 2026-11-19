import { calculateRatings, calculateRankingScoreForPlayer, shuffle } from "../shared/forms.js";
import { Play } from "./Play.js";

export function createPlayGenerator({ games, players }) {

    const [, chosenGames] = calculateRatings(games, players);

    function generatePlays() {
        const plays = [];
        let nextPlayId = 1;

        const sortedGames = sortGamesByPlayerCount(chosenGames);
        for (const [gameId, playersOfGame] of sortedGames) {
            const game = games.find(game => game.id === Number(gameId));
            const playGroups = findPlayerGroupsForPlays(game, playersOfGame);
            for (const group of playGroups) {
                const play = new Play(nextPlayId, game.id, null, null, group.map(player => player.playerId), null, null);
                if (game.duration.min >= 480) {
                    play.timeslotCount = 2;
                } else {
                    play.timeslotCount = 1;
                };
                play.validPlayerCount = play.isValidPlayerCount(game);
                plays.push(play);
                nextPlayId++;
            }
        };

        return plays;
    }
    
    function sortGamesByPlayerCount(games) {
        const sortedGames = structuredClone(games);
        return Object.entries(sortedGames).sort((a, b) => b[1].length - a[1].length);
    }
    
    function findPlayerGroupsForPlays(game, playersAndRanks) {
        let prefferedPlayerCount = game.playerCount.preferred;
        if (prefferedPlayerCount.length === 0) {
            prefferedPlayerCount = [];
            for (let i = game.playerCount.min; i <= game.playerCount.max; i++) {
                if (!game.playerCount.excluded.includes(i)) prefferedPlayerCount.push(i);
            };
        };
    
    
        if (prefferedPlayerCount.includes(playersAndRanks.length)) {
            return [playersAndRanks];
        };
    
        const sortedPlayers = sortPlayersByRank(playersAndRanks);
        const groupVariants = [];
        for (let i = 0; i <= 99; i++) {
            groupVariants.push(createPlayerGroupsForChosenGame(prefferedPlayerCount, game, sortedPlayers));
        }
        let bestGroupVariant = null;
        for (const groupVariant of groupVariants) {
            const currentGroupVariant = {
                playerGroup: groupVariant,
                penaltyScore: assessGroupVariants(groupVariant, prefferedPlayerCount)
            }
            if (bestGroupVariant === null) {
                bestGroupVariant = currentGroupVariant;
            } else if (bestGroupVariant.penaltyScore > currentGroupVariant.penaltyScore) {
                bestGroupVariant = currentGroupVariant;
            }
        }
        //console.log(game.title, `Anzahl der Gruppen: ${bestGroupVariant.playerGroup.length}`, `Strafpunkte: ${bestGroupVariant.penaltyScore}`);
    
        return bestGroupVariant.playerGroup;
    }
    
    function createPlayerGroupsForChosenGame(prefferedPlayerCount, game, playersOfGame) {
        const playerGroups = [];
        const playerGroupCounts = [];
        let remainingPlayerCount = playersOfGame.length;
        while ( prefferedPlayerCount.includes(remainingPlayerCount) || prefferedPlayerCount.some(count => remainingPlayerCount > count) ) {
            const playerCount = shuffle(prefferedPlayerCount)[0];
            const possibleRemaining = remainingPlayerCount - playerCount;
            if ( possibleRemaining < 0 ) continue;
            playerGroupCounts.push(playerCount);
            remainingPlayerCount = possibleRemaining;
        };
        if (remainingPlayerCount > 0 ) {
            playerGroupCounts.push(remainingPlayerCount);
        };
        let playersCopy = structuredClone(playersOfGame);
        playerGroupCounts.forEach(count => {
            playerGroups.push(playersCopy.splice(0, count));
        });
    
        return playerGroups;
    }
    
    function assessGroupVariants(groupVariant, prefferedPlayerCount) {
        let penaltyScore = 0;
        for (const group of groupVariant) {
            if (!prefferedPlayerCount.includes(group.length)) {
                for (const player of group) {
                    penaltyScore = penaltyScore + calculateRankingScoreForPlayer(player.rank);
                }
            }
        }
        return penaltyScore;
    }
    
    function sortPlayersByRank(playersAndRanks) {
        const sortedPlayers = structuredClone(playersAndRanks);
        return sortedPlayers.sort((a, b) => a.rank - b.rank);
    }

    return { generatePlays };
}