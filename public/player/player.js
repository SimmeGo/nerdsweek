import { generateForm } from "/shared/forms.js";
import { createButton } from "/shared/forms.js";
import { generateTableHead } from "/shared/forms.js";
import { generateTableBody} from "/shared/forms.js";
import { createFieldsForPlayer } from "/shared/forms.js";
import { addDataToDatabaseButton, createAndShowBackButton } from "../shared/forms.js";

const playersTableButtons = [
    {name: "editPlayerButton", label: "Bearbeiten", function: () => {window.location.href = "/admin/spiele"}},
    {name: "deletePlayerButton", label: "Löschen", function: () => {window.location.href = "/admin/spiele"}},
]

let players = [];
let fields = [];
let fieldsWithoutID = [];

const containerID = "formContainer";

function generatePlayersTableBody() {
    generateTableBody("playersTableBody", "/players", playersTableButtons, fields);
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

function start() {
    fields = createFieldsForPlayer();
    fieldsWithoutID = fields.slice(1);
    generateTableHead("playersTableHead", fields);
    generatePlayersTableBody();
    const backButton = createAndShowBackButton("/admin", "playersList", "playerBody");
    const addPlayerButton = createButton("addPlayerButton", "+", () => {
        addDataToDatabaseButton(fieldsWithoutID, containerID, "addPlayerToDatabaseButton", "Spieler hinzufügen", generatePlayersTableBody, "Spieler", sendPlayerToServer);
    });
    document.getElementById("playersTable");
    document.getElementById("playersList").insertBefore(addPlayerButton, document.getElementById("playersTable"));
}

start();