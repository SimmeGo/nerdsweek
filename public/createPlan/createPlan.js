import { getValuesfromForm } from "../shared/data_management.js";
import { calculateRatings, createButton, generateForm } from "../shared/forms.js";
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
let playersChoseGame = {};
let playCountOfGame = {};
let infractions = {};

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

    constructor(id, playedGame, timeSlot, players, duration, winner) {

        this.id = id;
        this.playedGame = playedGame;
        this.timeslot = timeSlot;
        this.players = players;
        this.duration = duration;
        this.winner = winner;
        this.complete = false;
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

function generatePlays() {
    games.forEach(game => {
        const playerCount = Object.entries(playersChoseGame).find(
            ([key, value]) => Number(key) === game.id
        )?.[1].length;
        let playCount = 1;
        if (playersChoseGame[game.id].length > game.playerCount.max) {
            playCount = Math.ceil(playersChoseGame[game.id].length / game.playerCount.max);
//            console.log(playCount);
        }
        //console.log(structuredClone(playerCount));
        for (let i = 1; i <= playCount; i++) {
            if (playerCount !== 0) {
                const play = new Play(nextPlayId, game.id, null, null, null, null);
                if (playerCount !== game.playerCount.excluded && playerCount >= game.playerCount.min) {
                    play.complete = true;
                }
                plays.push(play);
                nextPlayId++;
            }
        };
    });
    //console.log(`Es wurden erfolgreich ${plays.length} Partien für die Nerdsweek angelegt.`);
}

function assignPlayersToPlays() {
    //const playerCountofPlay = createPlayerCountforPlays();
    let availablePlayers = [];
    let lastGameId = 0;
    let remainingPlayerCount = 0;
    plays.forEach(play => {
        const thisGame = games.find(game => game.id === play.playedGame);
        const playCount = plays.filter(play => play.playedGame === thisGame.id).length;
        let playerCount = 0;
        if (remainingPlayerCount === 0) {
            remainingPlayerCount = playersChoseGame[play.playedGame].length;
        };
        if (playCount > 1 && remainingPlayerCount > thisGame.playerCount.max) {
            playerCount = Math.floor(playersChoseGame[thisGame.id].length / playCount);
        } else {
            playerCount = remainingPlayerCount;
        };
        remainingPlayerCount = remainingPlayerCount - playerCount;
        if (lastGameId !== thisGame.id) {
            availablePlayers = playersChoseGame[play.playedGame];;
        }
        lastGameId = thisGame.id;
        play.players = availablePlayers
            .sort(() => Math.random() - 0.5)
            .splice(0, playerCount);
        let playerNames = [];
        play.players.forEach(playerInGame => {
            const player = players.find(player => player.id === playerInGame);
            const playerName = `${player.firstName} ${player.lastName}`;
            playerNames.push(playerName);
        });
        if (thisGame.playerCount.excluded.includes(play.players.length) || thisGame.playerCount.min > play.players.length) {
            infractions.invalidPlayerCount.push({
                object: "play",
                objectId: play.id
            });

        }
        //console.log(`Die Spieler ${playerNames?.join(", ")} spielen gemeinsam das Spiel ${thisGame.title}`);
    });
}

function createTimeslots() {
    const dates = ["19.05.", "20.05.", "20.05.", "21.05.", "21.05.", "22.05.", "22.05.", "23.05."]
    for (let i = 1; i <= 8; i++) {
        let startTime;
        if (i % 2 === 0) {
            startTime = "10 Uhr";
        } else {
            startTime = "17 Uhr";
        };
        const timeslot = new Timeslot(i, dates[i - 1], startTime, null);
        timeslots.push(timeslot);
    }
}

function assignPlaysToTimeslot() {
    let finalCount = null;
    //console.log(`Der Timeslot von Play 1 ist ${plays[0].timeslot}.`);
    for (let i = 1; i <= 8; i++) {
        const randomPlayers = players
            .sort(() => Math.random() - 0.5);
        randomPlayers.forEach(player => {
            const timeslotCount = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0};
            const thisGame = games.find(game => game.id === player[`rank${i}`]);
            const rankPlay = plays.find(play =>
                play.playedGame === player[`rank${i}`] &&
                play.players.includes(player.id));
            for (const play of plays) {
                if (play.timeslot in timeslotCount) {
                    timeslotCount[play.timeslot]++;
                };
            };
            if (rankPlay.timeslot === null) {
                const [smallTimeslot, count] = Object.entries(timeslotCount).reduce(
                    (smallest, count) =>
                        count[1] < smallest[1] ? count : smallest
                );
                rankPlay.timeslot = Number(smallTimeslot);
            }
            finalCount = timeslotCount;
        })
    };
    plays.forEach(play => {
        //console.log(`Die Partie mit der ID ${play.id} findet im Zeitslot ${play.timeslot} statt.`);
    });
    for (let i = 1; i <= 8; i++) {
        const playsInTimeslot = plays.filter(play => play.timeslot === i);
        const playerInTimeslot = {};
        players.forEach(player => {
            playerInTimeslot[player.id] = 0;
        });
        for (const play of playsInTimeslot) {
            for (const playerId of play.players) {
                playerInTimeslot[playerId] = (playerInTimeslot[playerId] ?? 0) + 1;
            }
        }
        for (const [playerId, count] of Object.entries(playerInTimeslot)) {
            const excess = count - 1;

            if (excess > 0) {
                infractions.doublePlayer.push({
                    object: "timeslot",
                    objectId: i,
                    playerId: Number(playerId),
                    excess: excess
                });
            }
        }
    }
    const maxExcess = Math.max(
        0,
        ...infractions.doublePlayer.map(infraction => infraction.excess)
    );
    let totalExcess = 0;
    infractions.doublePlayer.forEach(infraction => {
        totalExcess = totalExcess + infraction.excess;
    });
    return [totalExcess, maxExcess];
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
    playersChoseGame = ratings[1];
    nextPlayId = 1;
}

function findBestPlan(oldPlan, newPlan) {
    let maxBetter = false;
    let totalBetter = false;
    let newBestPlan;
    if (oldPlan.maxExcess >= newPlan.maxExcess) {
        maxBetter = true;
    };
    if (oldPlan.totalExcess >= newPlan.totalExcess) {
        totalBetter = true;
    };
    if ((maxBetter && totalBetter) || (maxBetter && oldPlan.totalExcess + 3 >= newPlan.totalExcess)) {
        newBestPlan = newPlan;
    } else {
        newBestPlan = oldPlan;
    };
    return newBestPlan;
}

function optimizePlan(cycleCount) {
    let bestPlan = null;
    for (let i = 0; i < cycleCount; i++) {
        const [totalExcess, maxExcess] = generatePlan();
        const currentPlan = {
            plays: structuredClone(plays),
            totalExcess: totalExcess,
            maxExcess: maxExcess
        };
        if (!bestPlan) {
            bestPlan = currentPlan;
        } else {
            bestPlan = findBestPlan(bestPlan, currentPlan)
        }
    }
    return bestPlan;
}

function generatePlan() {
    resetValues();
    generatePlays();
    assignPlayersToPlays();
    return assignPlaysToTimeslot();
}

function startAlgorithm() {
    document.getElementById("resultContainer").innerHTML = "";
    const cycleCount = getValuesfromForm(fields);
    const bestPlan = optimizePlan(cycleCount);
    displayResults(bestPlan);
}

function displayResults(bestPlan) {
    const resultContainer = document.getElementById("resultContainer");
    const text = [];
    text.push(`Die Anzahl an Spielerdoppelungen in dem Plan liegt bei insgesamt ${bestPlan.totalExcess}. Jeden Spieler betrifft/betreffen dabei maximal ${bestPlan.maxExcess} Dopplung(en).`);
    for (let i = 1; i <= 8; i++) {
        const playsInTimeslot = bestPlan.plays.filter(play => play.timeslot === i);
        text.push(`Im ${i}. Zeitslot, am ${timeslots[i-1].date} um ${timeslots[i-1].date} finden folgende Partien statt:`)
        playsInTimeslot.forEach(play => {
            const playerNames = [];
            const thisGame = games.find(game => game.id === play.playedGame);
            play.players.forEach(playerId => {
                const thisPlayer = players.find(player => player.id === playerId);
                const thisRank = Object.entries(thisPlayer).find(([key, value]) => key.includes("rank") && value === play.playedGame);
                playerNames.push(`${thisPlayer.firstName} ${thisPlayer.lastName} (Rang ${thisRank[0].replace("rank", "")})`);
            });
            text.push(`In der ${i}. Partie spielen ${playerNames?.join(", ")} gemeinsam das Spiel ${thisGame.title}`);
        })
    }
    text.forEach(textElement => {
        const element = document.createElement("p");
        element.textContent = textElement;
        resultContainer.appendChild(element);
    })
} 

async function start() {
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    ratings = calculateRatings(games, players);
    gamesRating = ratings[0];
    playersChoseGame = ratings[1];
    createTimeslots();
    //optimizePlan();
    generateForm(fields, containerId);
    const startAlgorithmButton = createButton("startAlgorithm", "Starte Algorithmus", () => {startAlgorithm()});
    document.getElementById(containerId).appendChild(startAlgorithmButton);
}

start();