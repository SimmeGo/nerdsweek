import { calculateRankingScoreForPlayer } from "../shared/forms.js";

export function createPlanEvaluator({ games, players, TIMESLOTS }) {
    const RANKS = TIMESLOTS;
    
    function calculateSatisfactionScore(playsOfPlan) {
        const satisfactionPerPlayer = {};
        const maxSatisfactionPercent = 100;
        const unassignedPlays = [];
    
        
        playsOfPlan.forEach(play => {
            if (play.timeslot.includes(0)) unassignedPlays.push([play]);
        });
        
        const playCountsPerTimeslotAndPlayer = countPlaysPerPlayerPerTimeslot(playsOfPlan);
        
        for (const player of players) {
            const notAssignedGames = detectGamesNotAssignedToPlayer(playsOfPlan, player);
            
            satisfactionPerPlayer[player.id] = maxSatisfactionPercent;

            //const thisPlayersDoubleInfractions = infractions.doublePlayer.filter(infraction => infraction.playerId === player.id);
            //const thisPlayersNotPlayedInfractions = infractions.notPlayed.filter(infraction => infraction.playerIds.includes(player.id));
            
            //if (!Object.values(playCountsPerTimeslotAndPlayer[player.id]).some(count => count > 1) || Object.values(playsOfRanksPerPlayer[player.id].length === TIMESLOTS.length)) continue;
            
            const conflictingPlays = detectConflictingPlays(playCountsPerTimeslotAndPlayer[player.id], player.id, playsOfPlan);
    
            if (conflictingPlays.length === 0 && unassignedPlays.flatMap(play => play.players).includes(player.id)) continue;
            
            for (const conflict of [... conflictingPlays, ... unassignedPlays, ... notAssignedGames]) {
                const conflictingRanks = detectConflictingRanksForPlays(conflict, player);
                const satisfactionPenalty = calculateSatisfactionPenaltyPerConflict(conflictingRanks);
                const penaltyPercent = calculatePenaltyPercent(satisfactionPenalty);
                satisfactionPerPlayer[player.id] -= penaltyPercent;
            };
        }
    
        return satisfactionPerPlayer;
    }
    
    function countPlaysPerPlayerPerTimeslot(plays) {
        const counts = Object.fromEntries(
            players.map(player => [player.id,
                Object.fromEntries(
                    TIMESLOTS.map(timeslot => [timeslot, 0])
                )
            ])
        );
    
        for (const play of plays) {
            for (const playerId of play.players) {
                if (play.timeslot.includes(0)) continue;
    
                play.timeslot.forEach(timeslot => {
                    counts[playerId][timeslot] = (counts[playerId][timeslot] ?? 0) + 1;
                });
            };
        };
    
        return counts;
    }
    
    function detectGamesNotAssignedToPlayer(playsOfPlan, player) {
        const notAssignedGames = [];
        Object.entries(player.gamePreferences).filter(([key,]) => !["rank_excluded"].includes(key)).forEach(([, chosenGame]) => {
            const chosenGamePlay = playsOfPlan.find(play => play.playedGame === chosenGame && play.players.includes(player.id));
            if (!chosenGamePlay && chosenGame !== 0) {
                const thisGame = games.find(game => game.id === chosenGame);
                notAssignedGames.push([{
                    playedGame: chosenGame,
                    timeslotCount: thisGame.duration.min >= 480 ? 2 : 1,
                
                }]);
            };
        });
        return notAssignedGames;
    }
    
    function detectConflictingPlays(playCountsPerTimeslot, playerId, playsOfPlan) {
        
        const conflictingPlays = [];
        TIMESLOTS.forEach(timeslot => {
            if (playCountsPerTimeslot[timeslot] <= 1) return;
            conflictingPlays.push(playsOfPlan.filter(play =>
                play.timeslot.includes(timeslot) &&
                play.players.includes(playerId)
            ));
        });
    
        return conflictingPlays;
    }
    
    function detectConflictingRanksForPlays(conflict, player) {
        const conflictingRanks = [];
        const thisPlayersChosenGames = Object.entries(player.gamePreferences).filter(
            key => !["rank_excluded"].includes(key)
        );
        for (const conflictPlay of conflict) {
            for (const [rank, gameId] of thisPlayersChosenGames) {
                if (conflictPlay.playedGame === gameId) {
                    conflictingRanks.push({
                        rank: Number(rank.replace("rank_", "")),
                        longGame: conflictPlay.timeslotCount > 1
                    });
                };
            };
        };
        return conflictingRanks;
    }
    
    function calculateSatisfactionPenaltyPerConflict(conflictingRanks) {
        const satisfactionPenalty = [];
        for (const conflict of conflictingRanks) {
            let multiplier = 1;
            if (conflict.longGame) multiplier = 2;
            satisfactionPenalty.push(multiplier * calculateRankingScoreForPlayer(conflict.rank));
        };
        return satisfactionPenalty;
    }
    
    function calculatePenaltyPercent(satisfactionPenalty) {
        const fullSatisfaction = calculateFullSatisfaction();
        const smallSatisfactionPenalty = Math.min(... satisfactionPenalty);
    
        return smallSatisfactionPenalty === Infinity ? 0 :
            smallSatisfactionPenalty/fullSatisfaction * 100;
    }

    function calculateFullSatisfaction() {
        let fullSatisfaction = 0;
        for (const rank of RANKS) {
            fullSatisfaction += calculateRankingScoreForPlayer(rank);
        };
        return fullSatisfaction;
    }

    return {calculateSatisfactionScore};
}