import { generateForm } from "/shared/forms.js";
import { createButton } from "/shared/forms.js";
import { generateTableHead } from "/shared/forms.js";
import { generateTableBody} from "/shared/forms.js";
import { createFieldsForPlayer } from "/shared/forms.js";
import { addDataToDatabaseButton, createAndShowBackButton } from "../shared/forms.js";
import { getValues } from "/shared/data_management.js";
import { deleteDataFromDatabase, editDataInDatabase, refreshValues } from "../shared/data_management.js";

const playersTableButtons = [
    {name: "editPlayerButton", label: "Bearbeiten", function: player => {
        editDataInDatabase(containerID, player.id, fieldsWithoutID, players, "", sendPlayerToServer, generatePlayersTableBody, createGamesOptions);
    }},
    {name: "deletePlayerButton", label: "Löschen", function: player => {deleteDataFromDatabase(players, player.id, generatePlayersTableBody, sendPlayerToServer)}},
]

let players = [];
let games = [];
let fields = [];
let fieldsWithoutID = [];

const containerID = "formContainer";

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
            option.textContent = game.title;
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
    const backButton = createAndShowBackButton("/admin", "playersList", "playerBody");
    const addPlayerButton = createButton("addPlayerButton", "+", () => {
        addDataToDatabaseButton(fieldsWithoutID, containerID, "addPlayerToDatabaseButton", "Spieler hinzufügen", generatePlayersTableBody, "Spieler", sendPlayerToServer);
        createGamesOptions();
    });
    document.getElementById("playersTable");
    document.getElementById("playersList").insertBefore(addPlayerButton, document.getElementById("playersTable"));
}

start();