import { getValuesfromForm } from "../shared/data_management.js";
import { calculateRatings, createButton, generateForm, createAndShowBackButton, shuffle, calculateRankingScoreForPlayer, calculateAverage, generateTableHead, generateTableBody } from "../shared/forms.js";
import { initializeContainerDragAndDrop, initializePlayerDragAndDrop } from "./dragAndDrop.js";
import { getValues, refreshValues } from "/shared/data_management.js";
//Parameter für die Planung:
// ### oberste Priorität ###
// - Spiele, die von einem bestimmten Spieler gewählt wurden
// - Spielerzahl, die ein bestimmtes Spiel gewählt haben
// - Spielerzahl, für die ein Spiel geeignet ist (Daten aus game.playerCount werden genutzt, dabei wird versucht, eine präferierte Spielerzahl zu nutzen)
// ### mittlere Priorität ###
// - Zeitslots, zu dem ein Spieler anwesend ist (wir nehmen vorerst an, dass ein Spieler an allen Zeitslots teilnimmt, um den Algorithmus zu vereinfachen)
// - Tischzahl (es gibt eine maximale Tischzahl, die von parallel laufenden Spielen in Summe nicht überschritten werden darf)
// ### unterste Priorität ###
// - Spiellänge (Daten aus game.playTime werden genutzt, dabei wird versucht, ähnlich lange Spiele parallel laufen zu lassen)

let nextPlayId = 1;
let plays = [];
let games = [];
let players = [];
let timeslots = [];

let ratings = [];
let gamesRating = {};
let chosenGames = {};
let playCountOfGame = {};
let infractions = {};
let newExcessPenalty;
let bestPlays;

let rowNumber = 1;
let timeslotNumber = 1;

const TIMESLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const RANKS = TIMESLOTS;
const containerId = "formContainer";
const fields = [
    {
        element: "number",
        label: "Anzahl an Durchläufen",
        name: "cycleCount",
    }
]

class Play {

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

    assessPlayerCount(game) {
        return (
            this.players.length >= game.playerCount.min &&
            !game.playerCount.excluded.includes(this.players.length)
        );
    }

    clone() {
        const copy = new Play(this.id);
        copy.players = structuredClone(this.players);
        copy.timeslot = structuredClone(this.timeslot);
        return copy;
    }
}




//Plays erstellen

function generatePlays() {
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
            play.validPlayerCount = play.assessPlayerCount(game);
            plays.push(play);
            nextPlayId++;
        }
    };
}

function sortGamesByPlayerCount(games) {
    const sortedGames = structuredClone(games);
    return Object.entries(sortedGames).sort((a, b) => b[1].length - a[1].length);
}

function findPlayerGroupsForPlays(game, playersAndRanks) {
    let prefferedPlayerCount = game.playerCount.preferred;
    if (prefferedPlayerCount.length === 0) {
        for (let i = game.playerCount.min; i <= game.playerCount.max; i++) {
            prefferedPlayerCount.push(i);
        };
    };
    prefferedPlayerCount = prefferedPlayerCount.filter(playerCount => !game.playerCount.excluded.includes(playerCount));

    if (game.playerCount.preferred.includes(chosenGames[game.id].length)) {
        return [chosenGames[game.id]];
    }

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







function assignPlaysToTimeslot() {
    assignUnscheduledPlays();
    findDoublePlayerInfractions(plays);
}

function assignUnscheduledPlays() {
    for (const rank of RANKS) {
        for (const player of shuffle([...players])) {
            const gameId = player[`rank${rank}`];

            if (gameId === 0) continue;

            const play = findPlayForPlayerAndGame(player.id, gameId);

            if (!play || play.timeslot !== null || play.validPlayerCount === false) continue;

            play.timeslot = chooseTimeslot(play.timeslotCount, play.players, play.playedGame);
        }
    }
    for (const play of plays.filter(play => play.timeslot === null)) {
        play.timeslot = chooseTimeslot(play.timeslotCount, play.players, play.playedGame);
    }

    assessPlaysWithInvalidPlayCount();
}

function findPlayForPlayerAndGame(playerId, gameId) {
    return plays.find(play =>
        play.playedGame === gameId &&
        play.players.includes(playerId)
    );
}

function chooseTimeslot(timeslotCount, players, playedGame) {
    const playCountsPerTimeslotAndPlayer = countPlaysPerTimeslotAndPlayer();
    const freeTimeslotsForPlayers = findFreeTimeslotsForPlayers(playCountsPerTimeslotAndPlayer, players);

    //Jedes Spiel darf nur einmal pro Zeitslot vorkommen
    const playCountsPerTimeslotAndGame = countPlaysPerTimeslotAndGame();
    const freeTimeslotsForGames = findFreeTimeslotsForGames(playCountsPerTimeslotAndGame, playedGame);

    let bestTimeslots = freeTimeslotsForPlayers.filter((timeslot) => freeTimeslotsForGames.includes(timeslot));
    if (freeTimeslotsForPlayers.length === 0) {
        const conflictsPerTimeslot = countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, players);
        const leastConflictedTimeslots = Object.entries(conflictsPerTimeslot)
            .filter(([, conflictCount]) => conflictCount === Math.min(...Object.values(conflictsPerTimeslot)))
            .map(([timeslot]) => Number(timeslot));
        bestTimeslots = leastConflictedTimeslots.filter((timeslot) => freeTimeslotsForGames.includes(timeslot));
        //Object.entries(freeTimeslotsPlayerCount)
        //.filter(([, count]) => count === smallestCount)
        //.map(([timeslot]) => Number(timeslot));
    }

    const leastOccupiedTimeslots = findLeastOccuppiedTimeslots(bestTimeslots);
    const shuffledSlots = shuffle(leastOccupiedTimeslots);

    //const playerCounts = countPlayersPerTimeslot();
    //const leastOccupiedSlots = findLeastOccuppiedTimeslots(playerCounts);

    if (timeslotCount === 1) {
        return [shuffledSlots[0]];
    }

    return chooseTwoConsecutiveTimeslots(shuffledSlots, playCountsPerTimeslotAndPlayer, players);
}

function countPlaysPerTimeslotAndPlayer() {
    const counts = Object.fromEntries(
        TIMESLOTS.map(timeslot => [timeslot])
    );
    for (const timeslot of TIMESLOTS) {
        counts[timeslot] = Object.fromEntries(
            players.map(player => [player.id, 0])
        );
        const playsInTimeslot = findPlaysForTimeslot(timeslot);
        if (!Array.isArray(playsInTimeslot)) continue;
        for (const play of playsInTimeslot) {
            for (const player of play.players) {
                counts[timeslot][player] = (counts[timeslot][player] ?? 0) + 1;
            }
        }
    }

    return counts;
}

function findFreeTimeslotsForPlayers(playerCounts, players) {
    let timeslotIsFree;
    const freeTimeslots = [];
    for (const timeslot of TIMESLOTS) {
        timeslotIsFree = true;
        for (const [player, count] of Object.entries(playerCounts[timeslot])) {
            if (players.includes(Number(player)) && Number(count) > 0) {
                timeslotIsFree = false;
                break;
            }
        }
        if (timeslotIsFree === false) continue;
        freeTimeslots.push(Number(timeslot));
    }
    return freeTimeslots;
}

function countPlaysPerTimeslotAndGame() {
    const counts = Object.fromEntries(
        TIMESLOTS.map(timeslot => [timeslot])
    );
    for (const timeslot of TIMESLOTS) {
        counts[timeslot] = Object.fromEntries(
            Object.keys(chosenGames).map(game => [game, 0])
        );
        const playsInTimeslot = findPlaysForTimeslot(timeslot);
        if (!Array.isArray(playsInTimeslot)) continue;
        for (const play of playsInTimeslot) {
            counts[timeslot][play.playedGame] = (counts[timeslot][play.playedGame] ?? 0) + 1;
        }
    }
    return counts;
}

function findFreeTimeslotsForGames(gameCounts, playedGame) {
    let timeslotIsFree;
    const freeTimeslots = [];
    for (const timeslot of TIMESLOTS) {
        timeslotIsFree = true;
        for (const [game, count] of Object.entries(gameCounts[timeslot])) {
            if (playedGame === Number(game) && Number(count) > 0) {
                timeslotIsFree = false;
                break;
            }
        }
        if (timeslotIsFree === false) continue;
        freeTimeslots.push(Number(timeslot));
    }
    return freeTimeslots;
}

function countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, playersOfPlay) {
    const conflictsPerTimeslot = {};
    for (const timeslot of TIMESLOTS) {
        for (const [player, count] of Object.entries(playCountsPerTimeslotAndPlayer[timeslot])) {
            if (playersOfPlay.includes(Number(player)) && Number(count) > 0) {
                conflictsPerTimeslot[timeslot] = (conflictsPerTimeslot[timeslot] ?? 0) + 1;
            }
        }
    }
    return conflictsPerTimeslot;
}

function findLeastOccuppiedTimeslots(freeTimeslots) {
    const playerCounts = countPlayersPerTimeslot();
    const freeTimeslotsPlayerCount = Object.fromEntries(Object.entries(playerCounts).filter(([timeslot]) => freeTimeslots.includes(Number(timeslot))));
    const smallestCount = Math.min(...Object.values(freeTimeslotsPlayerCount));

    return Object.entries(freeTimeslotsPlayerCount)
        .filter(([, count]) => count === smallestCount)
        .map(([timeslot]) => Number(timeslot));
}

function countPlayersPerTimeslot() {
    const counts = Object.fromEntries(
        TIMESLOTS.map(timeslot => [timeslot, 0])
    );

    for (const play of plays) {
        if (!Array.isArray(play.timeslot)) continue;

        for (const timeslot of play.timeslot) {
            if (timeslot in counts) {
                counts[timeslot] += play.players.length;
            };
        };
    };

    return counts;
}

function chooseTwoConsecutiveTimeslots(candidateSlots, playCountsPerTimeslotAndPlayer, players) {
    const firstSlot = findTwoConsecutiveTimeslots(candidateSlots, playCountsPerTimeslotAndPlayer, players);

    //Ein Spiel mit einer Länge von zwei Slots darf nicht über Timeslot 8 hinausgehen.
    if (firstSlot === 8) {
        return [7, 8];
    }

    return [firstSlot, firstSlot + 1];
}

function findTwoConsecutiveTimeslots(freeSlots, playCountsPerTimeslotAndPlayer, players) {
    for (const timeslot of freeSlots) {
        if (freeSlots.includes(timeslot + 1)) {
            return timeslot;
        };
    };
    const conflictsPerTimeslot = countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, players);
    let bestSecondTimeslot;
    let after = true;
    for (const timeslot of freeSlots) {
        if (!bestSecondTimeslot) {
            if (timeslot === 8) {
                bestSecondTimeslot = timeslot - 1;
                after = false;
            } else {
                bestSecondTimeslot = timeslot + 1;
                after = true;
            }
        }
        if (timeslot !== 8) {
        if (conflictsPerTimeslot[timeslot + 1] < conflictsPerTimeslot[bestSecondTimeslot]) {
            bestSecondTimeslot = timeslot + 1;
            after = true;
        }
        } else if (timeslot !== 1) {
            if (conflictsPerTimeslot[timeslot - 1] < conflictsPerTimeslot[bestSecondTimeslot]) {
                bestSecondTimeslot = timeslot - 1;
                after = false;
            }
        } 
    };
    if (after) {
        return bestSecondTimeslot - 1;
    };
    return bestSecondTimeslot + 1;
}

function findPlaysForTimeslot(timeslot) {
    return plays.filter(play =>
        play.timeslot?.includes(timeslot)
    );
}

function assessPlaysWithInvalidPlayCount() {
    const playsWithInvalidPlaycount = plays.filter(play => play.validPlayerCount === false);
    for (const timeslot of TIMESLOTS) {
        const playsOfTimeslot = playsWithInvalidPlaycount.filter(play => play.timeslot.includes(timeslot)) ?? 0;
        if (playsOfTimeslot === 0) continue;
        for (const play of playsOfTimeslot) {
            const freePlayers = countFreePlayersPerTimeslot()[timeslot] ?? 0;

            if (freePlayers === 0) {
                play.timeslot = [0];
                infractions.notPlayed.push({
                    object: "play",
                    objectId: play.id,
                    playerIds: play.players
                })
                continue;
            }

            assignFreePlayersToPlays(freePlayers, play);
            
        };
    };
}

function assignFreePlayersToPlays(freePlayers, play) {
    const shuffledPlayers = shuffle(freePlayers);
    const playCopy = play.clone();
    const game = games.find(game => game.id === play.playedGame)
    for (const [index, player] of shuffledPlayers.entries()) {
        playCopy.players.push(player);
        playCopy.validPlayerCount = playCopy.assessPlayerCount(game);
        if (playCopy.validPlayerCount) {
            play.players.push(...shuffledPlayers.slice(0, index + 1));
            play.validPlayerCount = play.assessPlayerCount(game);
            break;
        };
    };
}

function countFreePlayersPerTimeslot() {
    const playsPerTimeslotAndPlayer = countPlaysPerTimeslotAndPlayer();
    const freePlayersPerTimeslot = {};
    for (const timeslot of TIMESLOTS) {
        for (const [player, count] of Object.entries(playsPerTimeslotAndPlayer[timeslot])) {
            if (count === 0) {
                freePlayersPerTimeslot[timeslot] ??= [];
                freePlayersPerTimeslot[timeslot].push(Number(player));
            }
        }
    }
    return freePlayersPerTimeslot;
}


function findDoublePlayerInfractions(currentPlays) {
    for (const timeslot of TIMESLOTS) {
        const playsInTimeslot = currentPlays.filter(play =>
            play.timeslot?.includes(timeslot)
        );

        const playerCounts = countPlaysPerPlayer(playsInTimeslot);

        for (const [playerId, count] of Object.entries(playerCounts)) {
            if (count <= 1) continue;

            infractions.doublePlayer.push({
                object: "timeslot",
                objectId: timeslot,
                playerId: Number(playerId),
                playIds: getPlayIdsForPlayer(playsInTimeslot, Number(playerId)),
                excess: count - 1
            })
        }
    }
}

function countPlaysPerPlayer(playsInTimeslot) {
    const counts = Object.fromEntries(
        players.map(player => [player.id, 0])
    );

    for (const play of playsInTimeslot) {
        for (const playerId of play.players) {
            counts[playerId] = (counts[playerId] ?? 0) + 1;
        };
    };

    return counts;
}

function getPlayIdsForPlayer(playsInTimeslot, playerId) {
    return playsInTimeslot
        .filter(play => play.players.includes(playerId))
        .map(play => play.id);
}






function calculateFullSatisfaction() {
    let fullSatisfaction = 0;
    for (const rank of RANKS) {
        fullSatisfaction += calculateRankingScoreForPlayer(rank);
    };
    return fullSatisfaction;
}

function calculateSatisfactionScore(playsOfPlan) {
    const satisfactionPerPlayer = {};
    const maxSatisfactionPercent = 100;
    for (const player of players) {
        satisfactionPerPlayer[player.id] = maxSatisfactionPercent;
        
        const thisPlayersDoubleInfractions = infractions.doublePlayer.filter(infraction => infraction.playerId === player.id);
        const thisPlayersNotPlayedInfractions = infractions.notPlayed.filter(infraction => infraction.playerIds.includes(player.id));
        
        if (thisPlayersDoubleInfractions.length === 0 && thisPlayersNotPlayedInfractions.length === 0) continue;
        
        const conflictingPlays = detectConflictingPlays(thisPlayersDoubleInfractions, thisPlayersNotPlayedInfractions, playsOfPlan);
        
        for (const conflict of conflictingPlays) {
            const conflictingRanks = detectConflictingRanksForPlays(conflict, player);
            const satisfactionPenalty = calculateSatisfactionPenaltyPerConflict(conflictingRanks);
            const penaltyPercent = calculatePenaltyPercent(satisfactionPenalty);
            satisfactionPerPlayer[player.id] -= penaltyPercent;
        };
    }

    return satisfactionPerPlayer;
}

function detectConflictingPlays(thisPlayersDoubleInfractions, thisPlayersNotPlayedInfractions, playsOfPlan) {
    const conflictingPlays = [];
    for (const infraction of thisPlayersDoubleInfractions) {
        conflictingPlays.push(playsOfPlan.filter(play =>
            play.timeslot.includes(infraction.objectId) &&
            play.players.includes(infraction.playerId)
        ));
    };
    for (const infraction of thisPlayersNotPlayedInfractions) {
        conflictingPlays.push(playsOfPlan.filter(play =>
            play.id === infraction.objectId &&
            play.players.some(player => infraction.playerIds.includes(player))
        ));
    }
    return conflictingPlays;
}

function detectConflictingRanksForPlays(conflict, player) {
    const conflictingRanks = [];
    for (const conflictPlay of conflict) {
        const thisPlayersChosenGames = Object.fromEntries(Object.entries(player.gamePreferences).filter(
            key => !["rank_excluded"].includes(key)
        ));
        for (const [rank, gameId] of Object.entries(thisPlayersChosenGames)) {
            if (conflictPlay.playedGame === gameId) {
                let longGame = false;
                if (conflictPlay.timeslotCount > 1) {
                    longGame = true;
                };
                conflictingRanks.push({
                    rank: Number(rank.replace("rank_", "")),
                    longGame: longGame
                });
            };
        };
    };
    return conflictingRanks;
}

function calculateSatisfactionPenaltyPerConflict(conflictingRanks) {
    const satisfactionPenalty = [];
    for (const rank of conflictingRanks) {
        let multiplier = 1;
        if (rank.longGame) multiplier = 2;
        satisfactionPenalty.push(multiplier * calculateRankingScoreForPlayer(rank.rank));
    }
    return satisfactionPenalty;
}

function calculatePenaltyPercent(satisfactionPenalty) {
    const fullSatisfaction = calculateFullSatisfaction();
    const smallSatisfactionPenalty = [...satisfactionPenalty]
        .sort((a, b) => a - b)
        .slice(0, satisfactionPenalty.length - 1);
        
    let penaltyPercent = 0;
    for (const value of smallSatisfactionPenalty) {
        penaltyPercent += value/fullSatisfaction * 100;
    }
    return penaltyPercent;
}




function resetValues() {
    infractions = {
        invalidPlayerCount: [],
        doublePlayer: [],
        tableCount: [],
        notPlayed: []
    };
    plays = [];
    ratings = calculateRatings(games, players);
    gamesRating = ratings[0];
    chosenGames = ratings[1];
    nextPlayId = 1;
    rowNumber = 1;
}



function countExcess() {
    const playerExcess = {};
    const timeslotExcess = {};
    const playExcess = {};
    players.forEach(player => {
        playerExcess[player.id] = 0;
    });
    for (const doublePlayer of infractions.doublePlayer) {
        playerExcess[doublePlayer.playerId] = (playerExcess[doublePlayer.playerId] ?? 0) + 1;
        timeslotExcess[doublePlayer.objectId] = (timeslotExcess[doublePlayer.objectId] ?? 0) + 1;
        doublePlayer.playIds.forEach(playId => {
            const play = plays.find(play => play.id === playId);
            playExcess[playId] = (playExcess[playId] ?? 0) + 1 / play.players.length * 60;
        });
    };
    
    const maxExcess = Math.max(
        0,
        ...infractions.doublePlayer.map(infraction => infraction.excess)
    );
    let totalExcess = 0;
    infractions.doublePlayer.forEach(infraction => {
        totalExcess = totalExcess + infraction.excess;
    });
    return [totalExcess, maxExcess, playerExcess, timeslotExcess, playExcess];
}

function calculateExcessPenalty(playerExcess) {
    const excessCount = {};
    let excessPenalty = 0;
    for (const [playerId, excessNumber] of Object.entries(playerExcess)) {
            excessCount[excessNumber] = (excessCount[excessNumber] ?? 0) + 1;
    };
    for(const [key, value] of Object.entries(excessCount)) {
        excessPenalty = excessPenalty + Number(key) * Number(key) * value;
    };
    return excessPenalty;
}

function generateAndCyclePlans(cycleCount) {
    let bestPlan = null;
    let cycleNumber = 0;
    for (let i = 0; i < cycleCount; i++) {
        generatePlan();
        const [totalExcess, maxExcess, playerExcess, timeslotExcess, playExcess] = countExcess();
        const currentPlan = {
            plays: structuredClone(plays),
            playerSatisfaction: calculateSatisfactionScore(plays),
            averageSatisfaction: calculateAverage(Object.values(calculateSatisfactionScore(plays))),
            playerExcess: playerExcess,
            totalExcess: totalExcess,
            maxExcess: maxExcess
            /*timeslotExcess: timeslotExcess,
            playExcess: playExcess,
            notAssignablePlayers: notAssignablePlayers*/
        };
        bestPlan = analysePlan(currentPlan, bestPlan, i);
        cycleNumber = i;
    }
    console.log(cycleNumber + 1);
    return bestPlan;
}

function analysePlan(currentPlan, bestPlan, i) {
    if (!bestPlan) {
        bestPlan = currentPlan;
        reportInbetweenResult(bestPlan, i);
    } else if (comparePlans(bestPlan, currentPlan)) {
        bestPlan = currentPlan;
        reportInbetweenResult(bestPlan, i);
    }
    return bestPlan;
}

function comparePlans(oldPlan, newPlan) {
    let comparisonScore = 0;
    for (const [playerId, satisfactionScore] of Object.entries(oldPlan.playerSatisfaction)) {
        const thisPlayersNewSatisfaction = newPlan.playerSatisfaction[playerId];
        if (thisPlayersNewSatisfaction >= satisfactionScore) comparisonScore += 1;
    }
    if (/*comparisonScore/Object.values(oldPlan.playerSatisfaction).length >= 0.5 && */Math.min(...Object.values(newPlan.playerSatisfaction)) <= Math.min(...Object.values(oldPlan.playerSatisfaction))) return false;
    console.log(`Insgesamt haben ${comparisonScore} Spieler bei diesem Plan einen besseren Zufriedenheitswert.`);
    //if (oldPlan.averageSatisfaction < newPlan.averageSatisfaction) return true;
    
    return true;
}

function reportInbetweenResult(bestPlan, i) {
    console.log(
        `Durchlauf ${i}:`,
        Math.round(bestPlan.averageSatisfaction),
        bestPlan.playerSatisfaction
    );
}



function generatePlan() {
    resetValues();
    generatePlays();
    return assignPlaysToTimeslot();
}





function startAlgorithm() {

    const cycleCount = getValuesfromForm(fields);
    const bestPlan = generateAndCyclePlans(cycleCount);
    displayResultsInTable(bestPlan);
    //optimizePlan(bestPlan);
}

function displayResults(bestPlan) {
    const resultContainer = document.getElementById("resultContainer");
    const text = [];
    let playCounter = 1;
    console.log(bestPlan);
    text.push(`Die Anzahl an Spielerdoppelungen in dem Plan liegt bei insgesamt ${bestPlan.totalExcess}. Jeden Spieler betrifft/betreffen dabei pro Zeitslot maximal ${bestPlan.maxExcess} Dopplung(en).`);
    players.forEach(player => {
        const thisPlayer = players.find(thisPlayer => thisPlayer.id === player.id);
        text.push(`Der Spieler ${thisPlayer.firstName} ${thisPlayer.lastName} hat in der gesamten Nerdsweek insgesamt ${bestPlan.playerExcess[thisPlayer.id]} Doppelungen.`);
    })
    for (let i = 1; i <= 8; i++) {
        
        const playsInTimeslot = bestPlan.plays.filter(play => play.timeslot?.includes(i));
        text.push(`Im ${i}. Zeitslot, am ${timeslots[i-1].date} um ${timeslots[i-1].startTime} finden folgende Partien statt:`)
        playsInTimeslot.forEach(play => {
            const playerNames = [];
            const thisGame = games.find(game => game.id === play.playedGame);
            play.players.forEach(playerId => {
                const thisPlayer = players.find(player => player.id === playerId);
                const thisRank = Object.entries(thisPlayer.gamePreferences).find(([key, value]) => value === play.playedGame) ?? ["rank_0"];
                playerNames.push(`${thisPlayer.firstName} ${thisPlayer.lastName} (Rang ${thisRank[0].replace("rank_", "")})`);
            });
            text.push(`In der ${playCounter}. Partie treffen beim Spiel ${thisGame.title} folgende Spieler aufeinander: ${playerNames?.join(", ")}.`);
            playCounter++;
        })
    }
    text.forEach(textElement => {
        const element = document.createElement("p");
        element.textContent = textElement;
        resultContainer.appendChild(element);
    })
}

function displayResultsInTable(bestPlan) {
    const fields = [];
    const playsPerTimeslot = [];
    console.log(bestPlan);

    const tableHead = document.getElementById("planTableHead");
    const tableBody = document.getElementById("planTableBody");
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";


    for (const timeslot of timeslots) {
        const playsOfThisTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(timeslot.id));
        
        const [freePlayers, doublePlayers] = classifyFreeAndDoublePlayers(playsOfThisTimeslot, timeslot);

        const notAssigned = {
            id: bestPlan.plays.length + 1,
            playedGame: "Nicht zugeordnet",
            players: freePlayers,
            timeslot: [timeslot.id]
        };
        playsOfThisTimeslot.push(notAssigned);
        bestPlan.plays.push(notAssigned);

        playsPerTimeslot.push(playsOfThisTimeslot);

        const column = {
            label: `Zeitslot ${timeslot.id},\n ${timeslot.date} ${timeslot.startTime}`,
            id: timeslot.id,
            get: (play, rowNumber, doublePlayers) => createCell(play, rowNumber, doublePlayers, timeslot.id, bestPlan.plays)
        }
        fields.push(column);

        const tableColumn = document.createElement("div");
        tableColumn.className = "plan-column";
        tableColumn.id = timeslot.id;

        const cell = document.createElement("div");
        cell.className = "head-cell";
        const span = document.createElement("span");
        span.textContent = column.label;
        cell.appendChild(span);
        tableHead.appendChild(cell);
        tableBody.appendChild(tableColumn);

        playsOfThisTimeslot.forEach((play, index) => {
            const cell = column.get(play, index, doublePlayers);
            tableColumn.appendChild(cell);
        });
    };
    const columnCount = Math.max(... playsPerTimeslot.map(plays => plays.length));

    document.documentElement.style.setProperty("--columnCount", `${columnCount}`)
    console.log(rowCount);
    const playsPerRow = [];
    for (let row = 0; row < rowCount; row++) {
        const playsInRow = {};
        playsPerTimeslot.forEach((playsOfTimeslot, index) => {
            playsInRow[index + 1] = playsOfTimeslot[row] ? playsOfTimeslot[row] : {};
        })
        playsPerRow.push(playsInRow);
    };
    console.log(playsPerTimeslot);
    //generatePlanTable(fields, playsPerTimeslot);

}

export function classifyFreeAndDoublePlayers(plays) {
    const freePlayers = [];
    const occupiedPlayers = [];
    const doublePlayers = [];
    plays.forEach(play => {
        play.players.forEach(player => {
            if (!occupiedPlayers.includes(player)) {
                occupiedPlayers.push(player)
            } else doublePlayers.push(player);
        });
    });
    players.forEach(player => {
        if (!occupiedPlayers.includes(player.id)) freePlayers.push(player.id);
    });

    return [freePlayers, doublePlayers];
}

export function createCell(play, rowNumber, doublePlayers, timeslot, plays) {
    
    if (!Object.keys(play).length) return "";

    const cellType = play.playedGame === "Nicht zugeordnet" ? "notAssigned" : "normal";
    const cellContainer = document.createElement("div");
    cellContainer.id = `cell${rowNumber + 1}-${timeslot}`;
    cellContainer.dataset.playId = play.id;
    cellContainer.dataset.timeslot = timeslot;
    cellContainer.dataset.allTimeslots = JSON.stringify(play.timeslot);
    cellContainer.dataset.cellType = cellType;
    cellContainer.className = "table-cell";
    const titleElement = document.createElement("span");
    const playedGame = play.playedGame === "Nicht zugeordnet" ? play.playedGame : games.find(game => game.id === play.playedGame).title;
    titleElement.className = "bold-text-in-table"
    titleElement.textContent = playedGame;
    cellContainer.appendChild(titleElement);
    
    initializeContainerDragAndDrop(cellContainer, plays);
    
    
    const playerContainer = document.createElement("div");
    playerContainer.id = `playerContainer${rowNumber + 1}-${timeslot}`;
    playerContainer.dataset.playId = play.id;
    playerContainer.className = "player-container";
    cellContainer.appendChild(playerContainer)
    
    createPlayerSection(play, playerContainer, cellContainer, doublePlayers, plays)

    return cellContainer;
}

export function createPlayerSection(play, playerContainer, cellContainer, doublePlayers, plays) {
    const fullNames = [];
    const initialsNames = [];

    playerContainer.innerHTML = "";
    
    play.players.forEach(player => {
        const thisPlayer = players.find(p => p.id === player);

        const playerElement = createPlayerElement(play, thisPlayer, doublePlayers, cellContainer.dataset.timeslot, plays);
    
        const [fullName, initialsName] = createPlayerName(play, thisPlayer);

        const span = document.createElement("span");
        playerElement.appendChild(span);
    
        initializePlayerDragAndDrop(playerElement);
    
        fullNames.push(fullName);
        initialsNames.push(initialsName);
        span.textContent = initialsName;
        playerContainer.appendChild(playerElement);
    });
    
    registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, cellContainer);
}

function createPlayerElement(play, thisPlayer, doublePlayers, timeslot, plays) {
    const playerElement = document.createElement("span");
    playerElement.dataset.playId = play.id;
    playerElement.dataset.playerId = thisPlayer.id;
    playerElement.dataset.timeslot = timeslot;
    playerElement.dataset.allTimeslots = JSON.stringify(play.timeslot);
    if (doublePlayers.includes(thisPlayer.id)) playerElement.className = "double-player";
    playerElement.id = `player${thisPlayer.firstName}${thisPlayer.lastName.slice(0,1)}`;
    playerElement.style.backgroundColor = thisPlayer.color;

    const removeButton = createButton(`remove${thisPlayer.firstName}Button`, "x", "text", "remove-player-button roundButton", () => 
        removePlayerFromPlay(playerElement.dataset.playId, playerElement.dataset.playerId, plays));
    playerElement.appendChild(removeButton);
    

    return playerElement;
}

function removePlayerFromPlay(playId, playerId, plays) {
    const play = plays.find(play => play.id === playId);
    const index = play.players.findIndex(player => player === playerId);
    if (index !== -1) {
        play.players.splice(index, 1);
    };
}

export function updateTimeslotColumn(playsInTimeslot, timeslot, plays) {
    const [, doublePlayers] = classifyFreeAndDoublePlayers(playsInTimeslot);
    updateUnassignedPlayers(playsInTimeslot, timeslot);
    const tableColumn = document.getElementById(timeslot);
    tableColumn.innerHTML = "";
    playsInTimeslot.forEach((play, index) => {
        const cell = createCell(play, index, doublePlayers, timeslot, plays)
        tableColumn.appendChild(cell);
    });
}

function updateUnassignedPlayers(plays, timeslot) {
    const index = plays.findIndex(play => play.playedGame === "Nicht zugeordnet");
    if (index === -1) {
        console.log("Kein passendes Play gefunden.");
        return;
    };
    const id = plays[index].id;
    plays.splice(index, 1);
    const [freePlayers, ] = classifyFreeAndDoublePlayers(plays);
    const notAssigned = {
        id: id,
        playedGame: "Nicht zugeordnet",
        players: freePlayers,
        timeslot: [timeslot]
    };
    plays.push(notAssigned);
}

function createPlayerName(play, thisPlayer) {
    const playerName = `${thisPlayer.firstName} ${thisPlayer.lastName}`;
    const initials = `${thisPlayer.firstName.slice(0,1)}${thisPlayer.lastName.slice(0,1)}`;
    const rank = Object.entries(thisPlayer.gamePreferences)
        .find(([key, value]) => value === play.playedGame);
    const rankNumber = rank ? rank[0].replace("rank_", "") : "0";
    const fullName = `${playerName} (${rankNumber})`;
    const initialsName = `${initials} (${rankNumber})`;

    return [fullName, initialsName];
}

function registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, cellContainer) {
    const spans = playerContainer.querySelectorAll(":scope > span");
    let showFull = true;

    cellContainer.addEventListener("click", () => {
        if (showFull) {
            playerContainer.style.height = playerContainer.scrollHeight;
            spans.forEach((span, index) => {
                const textSpan = span.querySelector(":scope > span");
                textSpan.textContent = fullNames[index];
                span.style.aspectRatio = "5 / 1";
            });
            playerContainer.style.gridTemplateColumns = "1fr";
            showFull = false;
        } else {
            playerContainer.style.height = "auto";
            spans.forEach((span, index) => {
                const textSpan = span.querySelector(":scope > span");
                textSpan.textContent = initialsNames[index];
                span.style.aspectRatio = "1 / 1";
            });
            playerContainer.style.gridTemplateColumns = "repeat(2, minmax(40px, 1fr))";
            showFull = true;
        };
    });
}

function findKey(object, operation) {
    const thisValue = operation(
        0,
        ...Object.values(object)
    );
    const key = Object.entries(object).find(
        ([key, value]) => value === thisValue
    )?.[0];
    return key;
}

/*function countPlayersPerTimeslot() {
    const playerCountPerTimeslot = {};
    for (let i = 1; i <= 8; i++) {
        const playsInTimeslot = plays.filter(play => play.timeslot === i);
        playsInTimeslot.forEach(play => {
            playerCountPerTimeslot[i] = (playerCountPerTimeslot[i] ?? 0) + play.players.length;
        });
    }
    return playerCountPerTimeslot;
}*/

function optimizePlan(currentBestPlan) {
    let i = 0;
    let bestPlan = currentBestPlan;
    while (currentBestPlan.totalExcess !== 0) {
        i++;
        const changedPlan = structuredClone(bestPlan);
        const maxExcessTimeslot = Number(findKey(changedPlan.timeslotExcess, Math.max));
        const thisTimeslotInfractions = infractions.doublePlayer.filter(infraction =>
            Number(infraction.objectId) === maxExcessTimeslot
        );
        const playsInTimeslot = changedPlan.plays.filter(play => play.timeslot?.includes(maxExcessTimeslot));
        const playIds = [];
        playsInTimeslot.forEach(play => {
            playIds.push(play.id);
        });
        const playExcessInTimeslot = Object.fromEntries(
            Object.entries(changedPlan.playExcess).filter(([playId]) => playIds.includes(Number(playId)))
        );
        const maxExcessPlayId = Number(findKey(playExcessInTimeslot, Math.max));
        const maxExcessPlay = plays.find(play => play.id === maxExcessPlayId);
        const playerCountPerTimeslot = countPlayersPerTimeslot();
        const minPlayerTimeslot = Number(findKey(playerCountPerTimeslot, Math.min));
        maxExcessPlay.timeslot = minPlayerTimeslot;
        bestPlan = changedPlan;
        if (i % 5 === 0) {
        //    currentBestPlan = analysePlan(changedPlan, currentBestPlan, i);
        }
        if (i >= 10000) {
            break;
        };
    };
    displayResults(bestPlan);
}

async function start() {
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    await refreshValues("timeslots");
    timeslots = await getValues("timeslots");
    console.log(players);


    ratings = calculateRatings(games, players);
    gamesRating = ratings[0];
    chosenGames = ratings[1];
    generateForm(fields, containerId);
    const startAlgorithmButton = createButton("startAlgorithm", "Starte Algorithmus", "text", "", () => {startAlgorithm()});
    document.getElementById(containerId).appendChild(startAlgorithmButton);
    const backButton = createAndShowBackButton("/admin", "planButtons");
}

start();