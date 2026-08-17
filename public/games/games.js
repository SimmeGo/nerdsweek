import { addDataToDatabase, deleteDataFromDatabase, editDataInDatabase, getValues } from "../shared/data_management.js";
import { 
    generateTableHead,
    generateTableBody,
    generateForm,
    createButton, 
    addDataToDatabaseButton,
    createAndShowBackButton } from "../shared/forms.js";

let playerCount = [];
let games = [];
let gameId = "";
let fieldsWithoutID = [];

const fields = [
        { 
            label: "ID",
            name: "id",
            get: game => game.id
        },
        { 
            element: "input", 
            label: "Titel", 
            type: "text", 
            name: "title",
            get: game => game.title, 
            mandatory: true 
        },
        { 
            element: "input", 
            label: "Minimale Spieleranzahl", 
            type: "number", 
            name: "minPlayers", 
            get: game => game.playerCount.min, 
            mandatory: true 
        },
        { 
            element: "input", 
            label: "Maximale Spieleranzahl", 
            type: "number", 
            name: "maxPlayers", 
            get: game => game.playerCount.max, 
            mandatory: true 
        },
        {
            element: "select", 
            label: "Bevorzugte Spieleranzahl",
            type: "number", 
            name: "preferredPlayers", 
            options: [], 
            multiple: true, 
            get: game => game.playerCount.preferred?.join(", ")  },
        { 
            element: "select", 
            label: "Ausgeschlossene Spieleranzahl", 
            type: "number", 
            name: "excludedPlayers", 
            options: [], 
            multiple: true, 
            get: game => game.playerCount.excluded?.join(", ") },
        { 
            element: "input", 
            label: "Minimale Spieldauer", 
            type: "number", 
            name: "minDuration", 
            get: game => game.duration.min,
            mandatory: true
        },
        {
            element: "input", 
            label: "Maximale Spieldauer", 
            type: "number", 
            name: "maxDuration", 
            get: game => game.duration.max,
            mandatory: true
        },
        {
            element: "input", 
            label: "Erklärdauer", 
            type: "number", 
            name: "explainingTime", 
            get: game => game.explainingTime,
            mandatory: true
        },
        {
            element: "input", 
            label: "Tischanzahl", 
            type: "number", 
            name: "tableCount", 
            get: game => game.tableCount,
            mandatory: true
        },
        {
            element: "select", 
            label: "Typ", 
            type: "text", 
            name: "type", 
            options: ["Koop: leicht", "Koop: normal", "Koop: schwer", "Koop: sehr schwer", "Punkte", "ohne Punkte", "Team"],
            multiple: false, get: game => game.type,
            mandatory: true
        },
    ];

const containerID = "formContainer";

const editSvg = "M10 22h12M15 6l3 3M5 16l3 3m-.34 1.113L22 5.773 18.226 2 3.886 16.34 2 22l5.66-1.887Z";
const deleteSvg= "M3 5.5h18m-2 0-.5 14.375c0 1.063-1 2.125-2 2.125h-9c-1 0-2-1.063-2-2.125L5 5.5m5 5V17m4-6.5V17M8.5 5.5V3.75c0-.875.875-1.75 1.75-1.75h3.5c.875 0 1.75.875 1.75 1.75V5.5";
const addSvg = "M21 12H3m9-9v18";

//const editGameButton = createButton("editGameButton", "Bearbeiten", "", );
//const deleteGameButton = createButton("deleteGameButton", "Löschen", "", () => deleteGameFromDatabase(game.id));

const gamesTableButtons = [
    { name: "editGameButton", label: editSvg, contentType: "image", function: game => editDataInDatabase(containerID, game.id, fieldsWithoutID, games, spawnPlayerCountOnEdit, sendGameToServer, generateGamesTableBody, false) },
    { name: "deleteGameButton", label: deleteSvg, contentType: "image", function: game => deleteDataFromDatabase(games, game.id, generateGamesTableBody, sendGameToServer) }
]

async function sendGameToServer(game_data, gameId, del) {
    const response = await fetch("/games", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: game_data[0],
            minPlayers: game_data[1],
            maxPlayers: game_data[2],
            preferredPlayers: game_data[3],
            excludedPlayers: game_data[4],
            minDuration: game_data[5],
            maxDuration: game_data[6],
            explainingTime: game_data[7],
            tableCount: game_data[8],
            type: game_data[9],
            gameId: gameId,
            del: del
        })
    });
    return await response.json();
}

function spawnPlayerCountOnEdit(dropdownId) {
    createPreferredAndExcludedPlayerCountList();
    addPlayerCountOptions(dropdownId);
}

function addPlayerCountOptions(dropdownId) {
    console.log(dropdownId);
    const dropdown = document.getElementById(dropdownId);
    const minPlayerCount = Number(document.getElementById("minPlayers").value);
    const maxPlayerCount = Number(document.getElementById("maxPlayers").value);
    const options = [];
    for (let i = minPlayerCount; i <= maxPlayerCount; i++) {
        options.push(i)
    }
    dropdown.innerHTML = "";
    options.forEach((option, index) => {
        const optionElement = document.createElement("option");
        optionElement.value = option; // Set the value to the index + 1
        optionElement.textContent = option;
        dropdown.appendChild(optionElement);
    });
    return [minPlayerCount, maxPlayerCount];
}

function createPreferredAndExcludedPlayerCountList() {
    if ( Number(document.getElementById("minPlayers").value) !== playerCount[0] || Number(document.getElementById("maxPlayers").value) !== playerCount[1]) {
        document.getElementById("preferredPlayers").addEventListener("focus", () => {
            playerCount = addPlayerCountOptions("preferredPlayers");
        });
        document.getElementById("excludedPlayers").addEventListener("focus", () => {
            playerCount = addPlayerCountOptions("excludedPlayers");
        });
    }
}

function addGameToDatabaseButton() {
    generateForm(fieldsWithoutID, containerID);
    console.log(document.getElementById("preferredPlayers"));
    console.log(document.getElementById("excludedPlayers"));
    const addGameToDatabaseButton = createButton("addGameToDatabase", "Spiel hinzufügen", "text", "", async () => {
        const gameId = 0; // game_id wird später an den Server übergeben. Ist sie 0, sagt dies dem Server, dass das Spiel neu in der Datenbank angelegt werden muss.
        await addDataToDatabase(gameId, fieldsWithoutID, sendGameToServer, containerID);
        generateGamesTableBody();
    });
    document.getElementById(containerID).appendChild(addGameToDatabaseButton);
    if ( Number(document.getElementById("minPlayers").value) !== playerCount[0] || Number(document.getElementById("maxPlayers").value) !== playerCount[1]) {
        document.getElementById("preferredPlayers").addEventListener("focus", () => {
            playerCount = addPlayerCountOptions("preferredPlayers");
        });
        document.getElementById("excludedPlayers").addEventListener("focus", () => {
            playerCount = addPlayerCountOptions("excludedPlayers");
        });
    }
}

async function generateGamesTableBody() {
    games = await generateTableBody("gamesTableBody", "games", gamesTableButtons, fields);
}

function start() {
    fieldsWithoutID = fields.slice(1);
    createAndShowBackButton("/admin", "gameButtons");
    const addGameButton = createButton("addGameButton", addSvg, "image", "roundButton", () => {
        addDataToDatabaseButton(fieldsWithoutID, containerID, "addGameToDatabaseButton", "Spiel hinzufügen", generateGamesTableBody, "Spiel", sendGameToServer);
        createPreferredAndExcludedPlayerCountList();
    });
    document.getElementById("gameButtons").appendChild(addGameButton);
    generateTableHead("gamesTableHead", fields);
    generateGamesTableBody();
}

start();