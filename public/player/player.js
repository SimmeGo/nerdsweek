import { generateForm } from "/shared/forms.js";
import { createButton } from "/shared/forms.js";
import { generateTableHead } from "/shared/forms.js";
import { generateTableBody} from "/shared/forms.js";
import { createFieldsForPlayer } from "/shared/forms.js";
import { addDataToDatabaseButton, createAndShowBackButton } from "../shared/forms.js";
import { getValues } from "/shared/data_management.js";
import { deleteDataFromDatabase, editDataInDatabase, refreshValues } from "../shared/data_management.js";


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

function createGamesOptions() {
    const rankFields = fields.filter(field => field.element === "select");
    rankFields.forEach( field => {
        const select = document.getElementById(field.name);
        select.innerHTML = "";
        let option = document.createElement("option");
        option.value = "-1";
        option.textContent = "--- Bitte auswählen ---"
        select.appendChild(option);
        games.forEach( game => {
            option = document.createElement("option");
            option.value = game.id;
            if (game.id) { // Fehler muss angezeigt werden!
                option.textContent = game.title;
            }
            select.appendChild(option);
        });
        option = document.createElement("option");
        option.value = "0";
        option.textContent = "keine Präferenz";
        select.appendChild(option);
    });
}

async function sendPlayerToServer(player_data, playerId, del) {
    const response = await fetch("/players", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            firstName: player_data[0],
            lastName: player_data[1],
            rank1: player_data[2],
            rank2: player_data[3],
            rank3: player_data[4],
            rank4: player_data[5],
            rank5: player_data[6],
            rank6: player_data[7],
            rank7: player_data[8],
            rank8: player_data[9],
            playerId: playerId,
            del: del
        })
    });
    return await response.json();
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
        createGamesOptions();
    });
    document.getElementById("playersTable");
    document.getElementById("playerButtons").appendChild(addPlayerButton);
}

start();