import { addDataToDatabase, deleteDataFromDatabase, editDataInDatabase, fillInputElements, getValues, refreshValues } from "../shared/data_management.js";
import { 
    generateTableHead,
    generateTableBody,
    generateForm,
    createButton, 
    addDataToDatabaseButton,
    createAndShowBackButton } from "../shared/forms.js";

let playerCount = [];
let games = [];
let gameCards = [];
let fieldsWithoutID = [];

const fields = [
    { 
        label: "ID",
        name: "id",
        get: game => game.id
    },
    { 
        element: "text", 
        label: "Titel", 
        name: "title",
        get: game => game.title, 
        mandatory: true 
    },
    { 
        element: "number", 
        label: "Minimale Spieleranzahl", 
        name: "minPlayers", 
        get: game => game.playerCount.min, 
        mandatory: true 
    },
    { 
        element: "number", 
        label: "Maximale Spieleranzahl", 
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
        element: "number", 
        label: "Minimale Spieldauer", 
        name: "minDuration", 
        get: game => game.duration.min,
        mandatory: true
    },
    {
        element: "number", 
        label: "Maximale Spieldauer", 
        name: "maxDuration", 
        get: game => game.duration.max,
        mandatory: true
    },
    {
        element: "number", 
        label: "Erklärdauer",  
        name: "explainingTime", 
        get: game => game.explainingTime,
        mandatory: true
    },
    {
        element: "number", 
        label: "Tischanzahl", 
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
        multiple: false,
        get: game => game.type,
        mandatory: true
    },
];

const cardFields = [
    { 
        element: "number",
        label: "ID",
        name: "id",
        get: gameCard => gameCard.id
    },
    {
        element: "text",
        label: "Bildpfad zum Spielcover",
        name: "gameCover",
        get: gameCard => gameCard.gameCover,
    },
    {
        element: "color",
        label: "Primärer HEX-Farbcode",
        name: "primaryGameColor",
        get: gameCard => gameCard.primaryGameColor,
        color: true
    },
    {
        element: "color",
        label: "Sekundäre HEX-Farbcode",
        name: "secondaryGameColor",
        get: gameCard => gameCard.secondaryGameColor,
        color: true
    },
    {
        element: "color",
        label: "Highlight-HEX-Farbcode",
        name: "highlightGameColor",
        get: gameCard => gameCard.highlightGameColor,
        color: true
    },
]

const containerID = "formContainer";

const editSvg = "M10 22h12M15 6l3 3M5 16l3 3m-.34 1.113L22 5.773 18.226 2 3.886 16.34 2 22l5.66-1.887Z";
const deleteSvg= "M3 5.5h18m-2 0-.5 14.375c0 1.063-1 2.125-2 2.125h-9c-1 0-2-1.063-2-2.125L5 5.5m5 5V17m4-6.5V17M8.5 5.5V3.75c0-.875.875-1.75 1.75-1.75h3.5c.875 0 1.75.875 1.75 1.75V5.5";
const addSvg = "M21 12H3m9-9v18";

//const editGameButton = createButton("editGameButton", "Bearbeiten", "", );
//const deleteGameButton = createButton("deleteGameButton", "Löschen", "", () => deleteGameFromDatabase(game.id));

const gamesTableButtons = [
    { name: "editGameButton", label: editSvg, contentType: "image", function: game => editDataInDatabase(containerID, game.id, fieldsWithoutID, games, spawnPlayerCountOnEdit, sendGameToServer, generateGamesTableBody, false) },
    { name: "deleteGameButton", label: deleteSvg, contentType: "image", function: game => deleteDataFromDatabase(games, game.id, generateGamesTableBody, sendGameToServer) },
    { name: "showGameCardButton", label: "Card", contentType: "text", function: game => openGameCardStatsDialog(game.id)}
];

function openGameCardStatsDialog(gameId) {
    const gameCardStats = document.getElementById("gameCardStats");
    const dialog = document.getElementById("gameCardDialog");
    dialog.showModal();
    const closeButton = createButton("closeButton", "X", "text", "", () => dialog.close());
    const form = generateForm(cardFields, "gameCardStats");
    form.className = "standardForm";
    //gameCardStats.appendChild(closeButton);

    const gameCard = gameCards.find(gameCard => gameCard.id === gameId);
    let dataId;
    if (!gameCard) {
        dataId = 0;
    } else {
        dataId = gameId;
    }

    gameCardStats.insertBefore(closeButton, form);
    const editButton = createButton("editButton", "Bearbeiten", "text", "", () => {
        for (const field of form.elements) {
            field.readOnly = false;
        };
        document.getElementById("editButton").remove();
        const saveButton = createButton("saveChangesButton", "Speichern", "text", "", async () => {
            await addDataToDatabase(dataId, cardFields, sendGameCardToServer, "gameCardStats", null);
            await refreshValues("gameCards");
            gameCards = await getValues("gameCards");  
            gameCardStats.prepend(closeButton);
        });
        gameCardStats.appendChild(saveButton);
    });
    gameCardStats.appendChild(editButton);

    cardFields.forEach(element => {
        const input = document.getElementById(element.name);
        if (gameCard) input.value = element.get(gameCard);
        input.readOnly = true;
    });

    console.log(gameCards);
    fillInputElements(cardFields, gameCards, gameId);
    const idField = document.getElementById("id");
    if (idField.value === "") idField.value = gameId;
}

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

async function sendGameCardToServer(gameCard_data, dataId, del) {
    const response = await fetch("/gameCards", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: gameCard_data[0],
            gameCover: gameCard_data[1],
            primaryGameColor: gameCard_data[2],
            secondaryGameColor: gameCard_data[3],
            highlightGameColor: gameCard_data[4],
            dataId: dataId,
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

async function addGameCardToDatabase(dataId, fields, sendFunction, containerID, join) {
    const formContainer = document.getElementById(containerID);
    const values = checkDataBeforeServer(fields, containerID);
    console.log(values);
    if ( values === null ) {
        return;
    }
    const result = await sendFunction(values, dataId, false);
    console.log(result);
    if (join) {
        formContainer.innerHTML = `Herzlich Willkommen, ${result.title}. Du hast dich erfolgreich zur Nerdsweek angemeldet!`;
    } else {
        formContainer.innerHTML = result.message;
    };
    return result.success;
}

function addGameToDatabaseButton() {
    const form = generateForm(fieldsWithoutID, containerID);
    form.className = "standardForm";
    console.log(document.getElementById("preferredPlayers"));
    console.log(document.getElementById("excludedPlayers"));
    const addGameToDatabaseButton = createButton("addGameToDatabase", "Spiel hinzufügen", "text", "", async () => {
        const gameId = 0; // gameId wird später an den Server übergeben. Ist sie 0, sagt dies dem Server, dass das Spiel neu in der Datenbank angelegt werden muss.
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

async function start() {
    await refreshValues("gameCards");
    gameCards = await getValues("gameCards");
    fieldsWithoutID = fields.slice(1);
    createAndShowBackButton("/admin", "gameButtons");
    const addGameButton = createButton("addGameButton", addSvg, "image", "roundButton", () => {
        addDataToDatabaseButton(fieldsWithoutID, containerID, "addGameToDatabaseButton", "Spiel hinzufügen", generateGamesTableBody, "Spiel", sendGameToServer);
        createPreferredAndExcludedPlayerCountList();
    });
    document.getElementById("gameButtons").appendChild(addGameButton);
    generateTableHead("gamesTableHead", [... fields, {label: "Aktionen"}]);
    generateGamesTableBody();
}

start();