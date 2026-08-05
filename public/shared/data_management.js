import { generateForm, createButton } from "/shared/forms.js";

let dataStore = {
    games: [],
    players: []
};

export function getValues(dataType) {
    return dataStore[dataType];
}

export async function refreshValues(dataType) {
    dataStore[dataType]  = await loadValues(dataType);
}

async function loadValues(dataType) {
    const response = await fetch(`/${dataType}`);
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

export async function addDataToDatabase(dataId, fields, sendFunction, containerID) {
    const formContainer = document.getElementById(containerID);
    const values = checkDataBeforeServer(fields, containerID);
    console.log(values);
    if ( values === null ) {
        return;
    }
    const result = await sendFunction(values, dataId, false);
    console.log(result);
    formContainer.innerHTML = result.message;
    return result.success;
}

export function editDataInDatabase(containerID, dataId, fields, data, multipleFunction, sendFunction, tableFunction, optionalFunction) {
    generateForm(fields, containerID, optionalFunction);
    if (optionalFunction) {
        optionalFunction();
    }
    const formContainer = document.getElementById(containerID);
    const dataEntry = data.find(dataEntry => dataEntry.id === dataId);
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
    const saveChangesButton = createButton("saveChangesButton", "Speichern", async () => {
        const values = checkDataBeforeServer(fields, containerID);
        console.log(values);
        const result = await sendFunction(values, dataId, false);
        formContainer.innerHTML = result.message;
        tableFunction();
    });
    const cancelButton = createButton("cancelButton", "Abbrechen", () => {
        formContainer.innerHTML = "";
    });
    formContainer.appendChild(cancelButton);
    formContainer.appendChild(saveChangesButton);
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

export function getValuesfromForm(fields) {
    let values = [];
    for (const field of fields) {
        console.log(`Der Wert von ${field.name} ist ${document.getElementById(field.name).value}.`);
        if ( document.getElementById(field.name).value === "" || document.getElementById(field.name).value === "-1" ) {
            if ( field.mandatory ) {
                console.log(`${field.name} ist ein Pflichtfeld!`)
                return null;
            }
            if ( field.type === "number" ) {
                document.getElementById(field.name).value = 0;
            }
        }
        if ( field.multiple ) {
            const multipleSelect = document.getElementById(field.name);
            values.push(Array.from(multipleSelect.selectedOptions).map(option =>
        Number(option.value)));
        } else {
            values.push(document.getElementById(field.name).value);
        }
    };
    console.log(values);
    return values;
}

export function checkDataBeforeServer(fields, containerID) {
    const data = getValuesfromForm(fields);
    const formContainer = document.getElementById(containerID);
    if (data === null) {
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Fülle bitte alle Felder mit einem * aus, bevor du fortfährst."
        formContainer.appendChild(errorMessage);
        return null;
    }
    return data;
}