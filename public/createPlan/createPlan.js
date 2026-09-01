import { getValuesfromForm } from "../shared/data_management.js";
import { calculateRatings, createButton, generateForm, createAndShowBackButton, shuffle, calculateRankingScoreForPlayer } from "../shared/forms.js";
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
let ratings = [];
let gamesRating = {};
let chosenGames = {};
let playCountOfGame = {};
let infractions = {};
let newExcessPenalty;

const TIMESLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const RANKS = TIMESLOTS;
const containerId = "formContainer";
const fields = [
    {
        element: "input",
        label: "Anzahl an Durchläufen",
        name: "cycleCount",
        type: "number"
    }
]

class Timeslot {

    constructor(id, date, startTime, playCount) {

        this.id = id;
        this.date = date;
        this.startTime = startTime;
        this.playCount = playCount;

    }
    assignGame(game) { }

}

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

    assessPlayerCount(playerCount) {

        if (this.players.length >= playerCount.min && this.players.length <= playerCount.max) {
            if (playerCount.preferred && playerCount.preferred.includes(this.players.length)) {
                return PLAYER_COUNT.PREFERRED;
            }
            else if (playerCount.excluded && playerCount.excluded.includes(this.players.length)) {
                return PLAYER_COUNT.INVALID;
            }
            else {
                return PLAYER_COUNT.OK;
            }
        }
        else {
            return PLAYER_COUNT.INVALID;
        }
    }
}

let timeslots = []

function findPlayerGroupsForPlays(game, playersAndRanks) {
    let prefferedPlayerCount = game.playerCount.preferred;
    if (game.playerCount.preferred.length === 0) {
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
    return playersAndRanks.sort((a, b) => a.rank - b.rank);
}

function generatePlays() {
    for (const gameId in chosenGames) {
        const game = games.find(game => game.id === Number(gameId));
        const playGroups = findPlayerGroupsForPlays(game, chosenGames[gameId]);
        for (const group of playGroups) {
            const play = new Play(nextPlayId, game.id, null, null, group.map(player => player.playerId), null, null);
            if (game.duration.min >= 480) {
                play.timeslotCount = 2;
            } else {
                play.timeslotCount = 1;
            };
            if (play.players.length < game.playerCount.min || game.playerCount.excluded.includes(play.players.length)) {
                play.validPlayerCount = false;
            } else {
                play.validPlayerCount = true;
            }
            plays.push(play);
        }
    };
}

function createTimeslots() {
    const dates = ["19.05.", "20.05.", "20.05.", "21.05.", "21.05.", "22.05.", "22.05.", "23.05."]
    for (const timeslot of TIMESLOTS) {
        let startTime;
        if (timeslot % 2 === 0) {
            startTime = "10 Uhr";
        } else {
            startTime = "17 Uhr";
        };
        const timeslotEntry = new Timeslot(timeslot, dates[timeslot - 1], startTime, null);
        timeslots.push(timeslotEntry);
    }
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

            play.timeslot = chooseTimeslot(play.timeslotCount, play.players);
        }
    }
    for (const play of plays.filter(play => play.timeslot === null)) {
        play.timeslot = chooseTimeslot(play.timeslotCount, play.players);
    }
}

function findPlayForPlayerAndGame(playerId, gameId) {
    return plays.find(play =>
        play.playedGame === gameId &&
        play.players.includes(playerId)
    );
}

function chooseTimeslot(timeslotCount, players) {
    const playCountsPerTimeslotAndPlayer = countPlaysPerTimeslotAndPlayer();
    const freeTimeslotsForPlayers = findFreeTimeslotsForPlayers(playCountsPerTimeslotAndPlayer, players);

    if (freeTimeslotsForPlayers.length === 0) {
        return ["not assignable"];
    }

    const leastOccupiedAndFreeTimeslots = findLeastOccuppiedTimeslots(freeTimeslotsForPlayers)
    const shuffledSlots = shuffle(leastOccupiedAndFreeTimeslots);

    //const playerCounts = countPlayersPerTimeslot();
    //const leastOccupiedSlots = findLeastOccuppiedTimeslots(playerCounts);


    if (timeslotCount === 1) {
        return [shuffledSlots[0]];
    }

    return chooseTwoConsecutiveTimeslots(shuffledSlots);
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

function findLeastOccuppiedTimeslots(freeTimeslots) {
    const playerCounts = countPlayersPerTimeslot();
    const freeTimeslotsPlayerCount = Object.fromEntries(Object.entries(playerCounts).filter(([timeslot]) => freeTimeslots.includes(Number(timeslot))));
    const smallestCount = Math.min(...Object.values(freeTimeslotsPlayerCount));

    return Object.entries(freeTimeslotsPlayerCount)
        .filter(([, count]) => count === smallestCount)
        .map(([timeslot]) => Number(timeslot));
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

function chooseTwoConsecutiveTimeslots(candidateSlots) {
    const firstSlot = candidateSlots[0];

    //Ein Spiel mit einer Länge von zwei Slots darf nicht über Timeslot 8 hinausgehen.
    if (firstSlot < 8) {
        return [firstSlot, firstSlot + 1];
    };

    const earlierSlot = candidateSlots.find(slot => slot < 8);

    return earlierSlot
        ? [earlierSlot, earlierSlot + 1]
        : [7, 8];
}

function findPlaysForTimeslot(timeslot) {
    return plays.filter(play =>
        play.timeslot?.includes(timeslot)
    );
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

function getPlayIdsForPlayer(playsInTimeslot, playerId) {
    return playsInTimeslot
        .filter(play => play.players.includes(playerId))
        .map(play => play.id);
}

function writeDoublePlayerInfractions() {

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

function countNotAssignablePlays() {
    return plays.filter(play => play.timeslot.includes("not assignable")).length;
}

function calculateSatisfactionScore() {

}

function resetValues() {
    infractions = {
        invalidPlayerCount: [],
        doublePlayer: [],
        tableCount: []
    };
    plays = [];
    ratings = calculateRatings(games, players);
    gamesRating = ratings[0];
    chosenGames = ratings[1];
    nextPlayId = 1;
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

function comparePlans(oldPlan, newPlan) {
    /*let oldExcessPenalty;
    if (oldPlan.maxExcess > newPlan.maxExcess) {
        newBetter = true;
    };
    if (oldPlan.maxExcess >= newPlan.maxExcess) {
        oldExcessPenalty = calculateExcessPenalty(oldPlan.playerExcess);
        newExcessPenalty = calculateExcessPenalty(newPlan.playerExcess);
        if (newExcessPenalty <= oldExcessPenalty) {
            if ((oldPlan.totalExcess +3 >= newPlan.totalExcess) && ((oldExcessPenalty > newExcessPenalty) || (oldPlan.maxExcess > newPlan.maxExcess))) {
                newBetter = true;
            };
            if (oldPlan.totalExcess >= newPlan.totalExcess) {
                newBetter = true;
            };

        }
    };*/
    if (oldPlan.notAssignablePlays > newPlan.notAssignablePlays) {
        return true;
    }
    return false;
}

function generateAndCyclePlans(cycleCount) {
    let bestPlan = null;
    let cycleNumber = 0;
    for (let i = 0; i < cycleCount; i++) {
        generatePlan();
        const [totalExcess, maxExcess, playerExcess, timeslotExcess, playExcess] = countExcess();
        const notAssignablePlays = countNotAssignablePlays();
        const currentPlan = {
            plays: structuredClone(plays),
            totalExcess: totalExcess,
            maxExcess: maxExcess,
            playerExcess: playerExcess,
            timeslotExcess: timeslotExcess,
            playExcess: playExcess,
            notAssignablePlays: notAssignablePlays
        };
        bestPlan = analysePlan(currentPlan, bestPlan, i);
        cycleNumber = i;
    }
    console.log(cycleNumber);
    return bestPlan;
}

function generatePlan() {
    resetValues();
    generatePlays();
    //assignPlayersToPlays();
    return assignPlaysToTimeslot();
}

function analysePlan(currentPlan, bestPlan, i) {
    if (!bestPlan) {
        bestPlan = currentPlan;
    } else if (comparePlans(bestPlan, currentPlan)) {
        bestPlan = currentPlan;
        console.log(
            `Durchlauf ${i}:`,
            bestPlan.maxExcess,
            bestPlan.totalExcess,
            newExcessPenalty,
            `übrige Plays: ${bestPlan.notAssignablePlays}`
        );
    }
    return bestPlan
}

function startAlgorithm() {
    document.getElementById("resultContainer").innerHTML = "";
    const cycleCount = getValuesfromForm(fields);
    const bestPlan = generateAndCyclePlans(cycleCount);
    displayResults(bestPlan);
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
        text.push(`Im ${i}. Zeitslot, am ${timeslots[i-1].date} um ${timeslots[i-1].date} finden folgende Partien statt:`)
        playsInTimeslot.forEach(play => {
            const playerNames = [];
            const thisGame = games.find(game => game.id === play.playedGame);
            play.players.forEach(playerId => {
                const thisPlayer = players.find(player => player.id === playerId);
                const thisRank = Object.entries(thisPlayer).find(([key, value]) => key.includes("rank") && value === play.playedGame);
                playerNames.push(`${thisPlayer.firstName} ${thisPlayer.lastName} (Rang ${thisRank[0].replace("rank", "")})`);
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
    ratings = calculateRatings(games, players);
    gamesRating = ratings[0];
    chosenGames = ratings[1];
    createTimeslots();
    generateForm(fields, containerId);
    const startAlgorithmButton = createButton("startAlgorithm", "Starte Algorithmus", "text", "", () => {startAlgorithm()});
    document.getElementById(containerId).appendChild(startAlgorithmButton);
    const backButton = createAndShowBackButton("/admin", "planButtons");
}

start();