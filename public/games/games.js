import { generateForm } from "/shared/forms.js";
import { createButton } from "/shared/forms.js";

let playerCount = [];
let games = [];

const gameTableColumns = [
    game => game.id,
    game => game.title,
    game => game.playerCount.min,
    game => game.playerCount.max,
    game => game.playerCount.preferred?.join(", "),
    game => game.playerCount.excluded?.join(", "),
    game => game.duration.min,
    game => game.duration.max,
    game => game.explainingTime,
    game => game.tableCount,
    game => game.type
]

async function addGameToDatabase() {
    const title = document.getElementById("title").value;
    const minPlayers = document.getElementById("minPlayers").value;
    const maxPlayers = document.getElementById("maxPlayers").value;
    const minDuration = document.getElementById("minDuration").value;
    const maxDuration = document.getElementById("maxDuration").value;
    const preferredPlayersSelect = document.getElementById("preferredPlayers");
    const preferredPlayers = Array.from(preferredPlayersSelect.selectedOptions).map(option =>
        Number(option.value)
    );
    const excludedPlayersSelect = document.getElementById("excludedPlayers");
    const excludedPlayers = Array.from(excludedPlayersSelect.selectedOptions).map(option =>
        Number(option.value)
    );
    const explainingTime = document.getElementById("explainingTime").value;
    const tableCount = document.getElementById("tableCount").value;
    const type = document.getElementById("type").value;
    
    const response = await fetch("/games", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: title,
            minPlayers: minPlayers,
            maxPlayers: maxPlayers,
            preferredPlayers: preferredPlayers,
            excludedPlayers: excludedPlayers,
            minDuration: minDuration,
            maxDuration: maxDuration,
            explainingTime: explainingTime,
            tableCount: tableCount,
            type: type
        })
    });
    const result = await response.json();
    console.log(result);
    console.log("Game added successfully");
    document.getElementById(containerID).innerHTML = "Game added successfully!";
}

function addPlayerCountOptions(dropdownID) {
    const dropdown = document.getElementById(dropdownID);
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

function addGameToDatabaseButton() {
    generateForm(fields, containerID);
    console.log(document.getElementById("preferredPlayers"));
    console.log(document.getElementById("excludedPlayers"));
    const addGameToDatabaseButton = createButton("addGameToDatabase", "Spiel hinzufügen", async () => {
        await addGameToDatabase();
        createGameTable();
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

async function createGameTable() {
    const gamesTableBody = document.getElementById("gamesTableBody");
    const response = await fetch("/games");
    gamesTableBody.innerHTML = "";
    games = await response.json();
    games.forEach(game => {
        const column = document.createElement("tr");
        gameTableColumns.forEach(getValue => {
            const cellElement = document.createElement("td");
            cellElement.textContent = getValue(game) ?? "";
            column.appendChild(cellElement);
        });
        gamesTableBody.appendChild(column);
    });

}

const fields = [
        { element: "input", label: "Titel", type: "text", name: "title" },
        { element: "input", label: "Minimale Spieleranzahl", type: "number", name: "minPlayers" },
        { element: "input", label: "Maximale Spieleranzahl", type: "number", name: "maxPlayers" },
        { element: "select", label: "Bevorzugte Spieleranzahl", type: "number", name: "preferredPlayers", options: [], multiple: true },
        { element: "select", label: "Ausgeschlossene Spieleranzahl", type: "number", name: "excludedPlayers", options: [], multiple: true },
        { element: "input", label: "Minimale Spieldauer", type: "number", name: "minDuration" },
        { element: "input", label: "Maximale Spieldauer", type: "number", name: "maxDuration" },
        { element: "input", label: "Erklärzeit", type: "number", name: "explainingTime" },
        { element: "input", label: "Tischanzahl", type: "number", name: "tableCount" },
        { element: "select", label: "Typ", type: "text", name: "type", options: ["Koop: leicht", "Koop: normal", "Koop: schwer", "Koop: sehr schwer", "Punkte", "ohne Punkte", "Team"], multiple: false }
    ];

const containerID = "formContainer";
const addGameButton = createButton("addGameButton", "+", () => {
    addGameToDatabaseButton();
});
const buttonPosition = document.getElementById("gameTable");

document.getElementById("gameList").insertBefore(addGameButton, buttonPosition);
createGameTable();