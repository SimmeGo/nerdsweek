import { generateForm, createButton } from "/shared/forms.js";

class Timeslot {

    constructor(id, date, startTime, playCount) {

        this.id = id;
        this.date = date;
        this.startTime = startTime;
        this.playCount = playCount;

    }
    assignGame(game) { }

}

let dataStore = {
    games: [],
    gameCards: [],
    players: [],
    timeslots: []
};

export function getValues(dataType) {
    return dataStore[dataType];
}

export async function refreshValues(dataType) {
    dataStore[dataType] = await loadValues(dataType);
}

async function loadValues(dataType) {
    if (dataType === "timeslots") return createTimeslots();
    const response = await fetch(`/${dataType}`, {cache: "no-store"});
    console.log(response.json);
    return await response.json();
}

export function translateValues(values) {
    let translatedValues = [];
    console.log(values);
    values.forEach(player => {
        let newPlayer = {};
        for (const [key, value] of Object.entries(player)) {
            let textContent = "";
            if (key.includes("rank") && value !== 0) {
                const game = dataStore.games.find(game => game.id === value);
                if (game) {
                    textContent = game.title;
                };
            } else if (value === 0) {
                textContent = "keine Präferenz";
            } else {
                textContent = value;
            };
            console.log(textContent);
            newPlayer[key] = textContent; 
        };
        translatedValues.push(newPlayer);
        console.log(newPlayer);
    });
    return translatedValues;
}

export async function addDataToDatabase(dataId, fields, sendFunction, containerID, join) {
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

export function editDataInDatabase(containerID, dataId, fields, data, multipleFunction, sendFunction, tableFunction, optionalFunction) {
    generateForm(fields, containerID, optionalFunction);
    if (optionalFunction) {
        optionalFunction();
    }
    const formContainer = document.getElementById(containerID);
    const dataEntry = data.find(dataEntry => dataEntry.id === dataId);

    fillInputElements(fields, data, dataId);
    
    const saveChangesButton = createButton("saveChangesButton", "Speichern", "text", "", async () => {
        const values = checkDataBeforeServer(fields, containerID);
        console.log(values);
        const result = await sendFunction(values, dataId, false);
        formContainer.innerHTML = result.message;
        tableFunction();
    });
    const cancelButton = createButton("cancelButton", "Abbrechen", "text", "", () => {
        formContainer.innerHTML = "";
    });
    formContainer.appendChild(cancelButton);
    formContainer.appendChild(saveChangesButton);
}

export function fillInputElements(fields, data, dataId) {
    const dataEntry = data.find(dataEntry => dataEntry.id === dataId);
    if (!dataEntry) return;
    fields.forEach(element => {
        const input = document.getElementById(element.name);
        if (element.multiple) {
            multipleFunction(element.name);
            const select = document.getElementById(element.name)
            for (const option of select.options) {
                option.selected = element.get(dataEntry).includes(Number(option.value));
            }
        } else {
        input.value = element.get(dataEntry);
        };
    });
}

export async function deleteDataFromDatabase(data, dataId, tableFunction, sendFunction) {
    console.log(data);
    const dataEntry = data.find(dataEntry => dataEntry.id === dataId);
    const message = confirm(`Möchtest du ${Object.values(dataEntry)[1]} wirklich löschen?`);
    if (message) {
        const result = await sendFunction([], dataId, true);
        if (result.success) {
            alert(result.message);
        }
        tableFunction();
    }
}

export async function sendPlayerToServer(player_data, playerId, del) {
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

export function getValuesfromForm(fields) {
    let values = [];
    for (const field of fields) {
        const content = document.getElementById(field.name).value;
        console.log(`Der Wert von ${field.name} ist ${document.getElementById(field.name).value}.`);
        if ( content === "" || content === "-1" ) {
            if ( field.mandatory ) {
                console.log(`${field.name} ist ein Pflichtfeld!`)
                return "Fülle bitte alle Felder mit einem * aus, bevor du fortfährst.";
            }
            if ( field.type === "number" ) {
                content = 0;
            }
        }
        if (field.color) {
            if (/[^a-fA-F0-9#]/.test(content) || content.length !== 7) {
                return "Bitte gib in allen Farb-Eingabefeldern einen gültigen Hexadezimal-Farbcode im Format #12AB45 ein."
            }
        }
        if ( field.multiple ) {
            const multipleSelect = document.getElementById(field.name);
            values.push(Array.from(multipleSelect.selectedOptions).map(option =>
        Number(option.value)));
        } else {
            values.push(content);
        }
    };
    return values;
}

export function checkDataBeforeServer(fields, containerID) {
    const data = getValuesfromForm(fields);
    const formContainer = document.getElementById(containerID);
    if (!Array.isArray(data)) {
        const errorMessage = document.createElement("p");
        errorMessage.textContent = data;
        formContainer.appendChild(errorMessage);
        return null;
    }
    return data;
}

function createTimeslots() {
    let timeslots = [];
    const dates = ["19.05.", "20.05.", "20.05.", "21.05.", "21.05.", "22.05.", "22.05.", "23.05."]
    for (const timeslot of TIMESLOTS) {
        let startTime;
        if (timeslot % 2 === 0) {
            startTime = "10 Uhr";
        } else {
            startTime = "17 Uhr";
        };
        const timeslotEntry = new Timeslot(timeslot, dates[timeslot - 1], startTime, null);
        timeslots.push(timeslotEntry);
    }
    return timeslots;
}