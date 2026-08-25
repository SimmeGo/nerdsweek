import { sendPlayerToServer, refreshValues, getValues } from "../shared/data_management.js";
import { addDataToDatabaseButton, createGamesOptions, createFieldsForPlayer } from "../shared/forms.js";

let games = [];
let players = [];

let fields = [];
let fieldsWithoutID;

async function start() {
    fields = createFieldsForPlayer();
    fieldsWithoutID = fields.slice(1);
    await refreshValues("games");
    games = await getValues("games");
    await refreshValues("players");
    players = await getValues("players");
    addDataToDatabaseButton(fieldsWithoutID, "joinForm", "addPlayerToDatabaseButton", "Anmelden", "", "Spieler", sendPlayerToServer, true);
    createGamesOptions(fields);
}

start();