import { generateTableBody, generateTableHead, createAndShowBackButton, calculateRatings } from "../shared/forms.js";
import { refreshValues, getValues } from "../shared/data_management.js";

let players = [];
let games = [];
let ratings = [];
let values = [];

const containerID = "formContainer";

const fields = [
        {
            label: "ID",
            name: "id",
            get: ranking => ranking.id,
            sort: (a, b) => a.id - b.id
        },
        { 
            label: "Spiel", 
            name: "game",
            get: ranking => ranking.title, 
            sort: (a, b) => a.title.localeCompare(b.title)
        },
        { 
            label: "Punkte", 
            name: "points",
            get: ranking => ranking.rating,
            sort: (a, b) => b.rating - a.rating
        },
        { 
            label: "Anzahl der Spieler", 
            name: "playerChoiceCount",
            get: ranking => ranking.playerCount,
            sort: (a, b) => b.playerCount - a.playerCount
        }
];

const rankingTableButtons = [
    {name: "showPlayersButton", label: "Spieler anzeigen", contentType: "text", function: ranking => { showPlayersOfGame(ranking.id) }},
]

function showPlayersOfGame(gameId) {
    const playersOfGame = ratings[1][gameId];
    const playerNames = playersOfGame.map(playerId => {
        const player = players.find(p => p.id === playerId);
        const playerRating = Object.entries(player).find(([key, value]) => key.includes("rank") && value === gameId);
        return `${player.firstName} ${player.lastName} - Rang ${playerRating[0].replace("rank", "")}`;
    });
    alert(`Spieler, die dieses Spiel gewählt haben:\n\n${playerNames.join("\n")}`);
}

function generateRankingTableBody(values) {
    generateTableBody("rankingTableBody", values, rankingTableButtons, fields, false);
}

function createTableValues() {
    let values = [];
    const gamesRating = ratings[0];
    const playersChoseGame = ratings[1];
    games.forEach(game => {
        let object = {};
        object["id"] = game.id;
        object["title"] = game.title;
        object["rating"] = Object.entries(gamesRating).find(
            ([key, value]) => Number(key) === game.id
        )?.[1];
        object["playerCount"] = Object.entries(playersChoseGame).find(
            ([key, value]) => Number(key) === game.id
        )?.[1].length;
        values.push(object);
    })
    return values;
}



function countPlayerChoice() {

}

async function start() {
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    ratings = calculateRatings(games, players);
    values = createTableValues();
    console.log(players);
    console.log(games);
    generateTableHead("rankingTableHead", fields, values, generateRankingTableBody);
    generateRankingTableBody(values);
    const backButton = createAndShowBackButton("/admin", "rankingButtons");
}

start();