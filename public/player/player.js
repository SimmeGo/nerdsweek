import {
    generateForm,
    createButton,
    generateTableBody,
    generateTableHead,
    createFieldsForPlayer,
    addDataToDatabaseButton,
    createAndShowBackButton,
    createGamesOptions
}
from "../shared/forms.js";

import {
    getValues,
    deleteDataFromDatabase,
    editDataInDatabase,
    refreshValues
}
from "../shared/data_management.js";


let players = [];
let games = [];
let fields = [];
let fieldsWithoutID = [];

const containerID = "formContainer";
const addSvg = "M21 12H3m9-9v18";
const editSvg = "M10 22h12M15 6l3 3M5 16l3 3m-.34 1.113L22 5.773 18.226 2 3.886 16.34 2 22l5.66-1.887Z";
const deleteSvg= "M3 5.5h18m-2 0-.5 14.375c0 1.063-1 2.125-2 2.125h-9c-1 0-2-1.063-2-2.125L5 5.5m5 5V17m4-6.5V17M8.5 5.5V3.75c0-.875.875-1.75 1.75-1.75h3.5c.875 0 1.75.875 1.75 1.75V5.5";
const playersTableButtons = [
    {name: "editPlayerButton", label: editSvg, contentType: "image", class: "", function: player => {
        editDataInDatabase(containerID, player.id, fieldsWithoutID, players, "", sendPlayerToServer, generatePlayersTableBody, createGamesOptions);
    }},
    {name: "deletePlayerButton", label: deleteSvg, contentType: "image", class: "", function: player => {deleteDataFromDatabase(players, player.id, generatePlayersTableBody, sendPlayerToServer)}},
]

function generatePlayersTableBody() {
    generateTableBody("playersTableBody", "players", playersTableButtons, fields, true);
}





async function start() {
    fields = createFieldsForPlayer();
    fieldsWithoutID = fields.slice(1);
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    generateTableHead("playersTableHead", fields);
    generatePlayersTableBody();
    const backButton = createAndShowBackButton("/admin", "playerButtons");
    const addPlayerButton = createButton("addPlayerButton", addSvg, "image", "roundButton", () => {
        addDataToDatabaseButton(fieldsWithoutID, containerID, "addPlayerToDatabaseButton", "Spieler hinzufügen", generatePlayersTableBody, "Spieler", sendPlayerToServer);
        createGamesOptions(fields);
    });
    document.getElementById("playersTable");
    document.getElementById("playerButtons").appendChild(addPlayerButton);
}

start();