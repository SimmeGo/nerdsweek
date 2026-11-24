import { addDataToDatabase, getValues, refreshValues, translateValues } from "../shared/data_management.js";

export function createButton(id, label, contentType, cssClass, onClick) {
    const button = document.createElement("button");
    button.id = id;
    //button.textContent = label;
    button.className = cssClass;
    button.type = "button";
    button.addEventListener("click", onClick);
    let content;
    if (contentType === "text") {
        content = document.createElement("span");
        content.textContent = label;
    } else if (contentType === "image") {
        content = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        content.setAttribute("viewBox", "0 0 24 24");
        content.setAttribute("aria-hidden", "true");
        content.setAttribute("fill", "none");
        content.setAttribute("stroke", "currentColor");
        content.setAttribute("stroke-linecap", "round");
        content.setAttribute("stroke-linejoin", "round");
        content.setAttribute("stroke-width", "1.8");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", label);
        path.setAttribute("stroke", "currentColor");
        content.appendChild(path);
    }
    button.appendChild(content);
    return button;
}

export function createAndShowBackButton(destination, bodyId) {
    const backSvg = "M17.6 5.8 11.5 12l6.1 6.2m-5-12.4L6.5 12l6.1 6.2";
    const backButton = createButton("backButton", backSvg, "image", "roundButton", () => {window.location.pathname = destination});
    document.getElementById(bodyId).appendChild(backButton);
}

export function generateForm(fields, containerID) {
    const formContainer = document.getElementById(containerID);
    formContainer.innerHTML = "";

    const form = document.createElement("form");
    form.id = `${containerID}Form`;

    const creators = new Map([
        ["fieldset", createFieldset],
        ["select", createSelectElement],
        ["text", createInputElement],
        ["email", createInputElement],
        ["password", createInputElement],
        ["color", createInputElement],
        ["number", createInputElement],
        ["legend", createLegendElement],
        ["radio", createRadioElement],
        ["checkbox", createCheckboxElement],
        ["rive", createRiveElement]
    ])
    formContainer.appendChild(form);
    fields.forEach(field => {
        let container;
        if (field.row && !document.getElementById(String(field.row))) {
            container = document.createElement("div");
            container.id = String(field.row);
            form.appendChild(container);
        } else if (field.row && document.getElementById(String(field.row))) {
            container = document.getElementById(String(field.row));
        } else {
            container = form;
        };
        const createElement = creators.get(field.element);

        if (!createElement) {
            throw new Error(`Unbekannte Feldart: ${field.element}`);
        };

        container.appendChild(createElement(field));
    });
    return form;
}

function createLabel(field, textContent) {
    const label = document.createElement("label");
    label.className = field.class ? `${field.class} ${field.element}Label` : `${field.element}Label`;
    if ( field.mandatory && !field.legend && textContent) {
        label.textContent = `${textContent}*`
    } else if (textContent) {
        label.textContent = textContent;
    };
    //label.setAttribute("for", field.name);

    return label;
}

function createFieldset(field) {
    const fieldset = document.createElement("fieldset");
    fieldset.id = field.name;
    fieldset.name = field.name;
    fieldset.className = field.class ? `${field.class} fieldset` : "fieldset";

    return fieldset;
}

function isPartOfFieldset(field, label) {
    if (!field.fieldset) return label;

    const fieldset = document.getElementById(field.fieldset);
    fieldset.appendChild(label);

    return fieldset;
}

function createSelectElement(field) {
    const label = createLabel(field, field.label);

    const select = document.createElement("select");
    select.name = field.name;
    select.id = field.name;
    select.className = "formElement";
    if ( field.multiple ) {
        select.multiple = true;
    }
    if (field.options !== "") {
        field.options.forEach((option, index) => {
            const optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.focus
            select.appendChild(optionElement);
        });
    };

    label.appendChild(select);

    return isPartOfFieldset(field, label);
}

function createInputElement(field) {
    const label = createLabel(field, field.label);

    const input = document.createElement("input");
    input.type = field.element;
    input.name = field.name;
    input.id = field.name;
    input.className = "formElement";

    label.appendChild(input);

    return isPartOfFieldset(field, label);
}

function createLegendElement(field) {
    const legend = document.createElement("legend");
    legend.name = `${field.name}Legend`;
    legend.id = `${field.name}Legend`;
    legend.className = field.class ? `${field.class} formElement` : "formElement";
    legend.textContent = field.mandatory ? `${field.legend}*` : field.legend;

    return isPartOfFieldset(field, legend);
}

function createRadioElement(field) {
    const fieldset = document.getElementById(field.fieldset);
    const legend = createLegendElement(field);
    field.labels.forEach((label, index) => {
        const labelElement = createLabel(field, false);
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `${field.name}`;
        radio.id = `${field.name}${index + 1}`;
        radio.value = label[1];
        radio.className = "formElement";
        labelElement.appendChild(radio);
        const span = document.createElement("span");
        span.textContent = label[0];
        labelElement.appendChild(span);
        fieldset.appendChild(labelElement);
    });

    return fieldset;
}

function createCheckboxElement(field) {
    const label = createLabel(field, false);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = field.name;
    checkbox.id = field.name;
    checkbox.value = field.value;
    checkbox.className = "formElement";

    label.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = field.mandatory ? `${field.label}*` : field.label;
    label.appendChild(span);

    return isPartOfFieldset(field, label);
}

function createRiveElement(field) {

}

export async function createFieldsForPlayers(part) {
    const parts = new Map([
        ["personalData", createFieldsForPersonalData],
        ["logistics", createFieldsForLogistics],
        ["other", createFieldsForOther],
        ["ranking", createRankFields],
        ["all", createAllFields]
    ]);

    return await parts.get(part)();
}

function createFieldsForPersonalData() {
    return [
        { 
            row: 1,
            element: "text",
            name: "firstName",
            label: "Vorname",
            get: player => player.firstName, set: (player, value) => { player.firstName = value; },
            mandatory: true
        },
        {
            row: 1,
            element: "text",
            name: "lastName",
            label: "Nachname",
            get: player => player.lastName, set: (player, value) => { player.lastName = value; },
            mandatory: true
        },
        {
            row: 2,
            element: "text",
            name: "email",
            label: "E-Mail-Adresse",
            get: player => player.data.email, set: (player, value) => { player.data.email = value; },
            mandatory: true
        },
        {
            row: 2,
            element: "text",
            name: "mobile",
            label: "Mobil",
            get: player => player.data.mobile, set: (player, value) => { player.data.mobile = value; },
            mandatory: true
        },
    ];
}

async function createFieldsForLogistics() {
    await refreshValues("timeslots");
    const timeslots = await getValues("timeslots").filter(timeslot => timeslot.id !== 0);
    let fields = [
        { 
            element: "fieldset",
            name: "attendance"
        },
        {
            element: "legend",
            label: "Wann nimmst du an der Nerdsweek teil?"
        },
        {
            element: "checkbox",
            name: "timeslots",
            class: "completeNerdsweek",
            label: "Ich nehme an der gesamten Nerdsweek teil.",
            fieldset: "attendance",
            value: "all",
            get: player => player.timeslots.slot_all,
            set: (player, value) => { player.timeslots.slot_all = value; }
        },
    ];
    timeslots.forEach((timeslot, index) => {
        fields.push({
            element: "checkbox",
            name: "timeslots",
            label: `Zeitslot ${index + 1}, \u200B${timeslot.date} ${timeslot.startTime}`,
            fieldset: "attendance",
            value: `${index + 1}`,
            get: player => player.timeslots[`slot_${index + 1}`],
            set: (player, value) => { player.timeslots[`slot_${index + 1}`] = value; }
        });
    });
    fields.push(
        {
            element: "fieldset",
            name: "stay"
        },
        {
            element: "radio",
            name: "stayOvernight",
            legend: "Ich übernachte im \"Haus der Stille\".",
            labels: [["Ja", "true"], ["Nein", "false"]],
            fieldset: "stay",
            get: player => player.data.overnightOptions.stayOvernight,
            set: (player, value) => { player.data.overnightOptions.stayOvernight = value; },
            mandatory: true
        },
        {
            element: "select",
            name: "roomPreference",
            label: "Zimmerwunsch",
            class: "double-width",
            fieldset: "stay",
            get: player => player.data.overnightOptions.roomPreference,
            set: (player, value) => { player.data.overnightOptions.roomPreference = value; },
            options: ["Matratzenlager", "Zelt", "Einzelzimmer", "Doppelzimmer"],
            mandatory: true
        },
        {
            element: "fieldset",
            name: "bedLinen"
        },
        {
            element: "radio",
            name: "bedLinenNeeded",
            legend: "Ich möchte Bettwäsche ausleihen",
            labels: [["Ja (+ ca. 7,50€)", "true"], ["Nein", "false"]],
            fieldset: "bedLinen",
            get: player => player.data.overnightOptions.bedLinenNeeded,
            set: (player, value) => { player.data.overnightOptions.bedLinenNeeded = value; },
            mandatory: true
        },
    )
    return fields;
}

function createFieldsForOther() {
    return [
        {
            element: "fieldset",
            name: "transportation",
            class: "grid-3to1"
        },
        { 
            element: "radio",
            legend: "Wie reist du an?",
            name: "modeOfTransportation",
            labels: [["eigener PKW", "ownCar"], ["(selbst organisierte) Mitfahrgelegenheit", "rideShare"], ["Zug", "train"]],
            fieldset: "transportation",
            get: player => player.data.modeOfTransportation, set: (player, value) => { player.data.modeOfTransportation = value; },
            mandatory: true
        },
        {
            element: "fieldset",
            name: "foodNeeds",
            class: "grid-3to1"
        },
        { 
            element: "legend",
            legend: "Was gibt es bei der Verpflegung zu beachten?",
            fieldset: "foodNeeds"
        },
        {
            element: "checkbox",
            name: "foodNeeds",
            label: "Ich esse vegetarisch.",
            fieldset: "foodNeeds",
            value: "vegetarian",
            get: player => player.data.specialFoodNeeds.vegetarian,
            set: (player, value) => { player.data.specialFoodNeeds.vegetarian = value; }
        },
        { 
            element: "checkbox",
            name: "foodNeeds",
            label: "Ich habe folgende Allergien/\u200BUnverträglichkeiten:",
            fieldset: "foodNeeds",
            value: "otherFoodNeeds",
            get: player => player.data.specialFoodNeeds.other,
            set: (player, value) => { player.data.specialFoodNeeds.other = value; }
        },
        { 
            element: "text",
            name: "foodNeedsText",
            label: "",
            fieldset: "foodNeeds",
            get: player => player.data.specialFoodNeeds.text,
            set: (player, value) => { player.data.specialFoodNeeds.text = value; }
        },

        {
            element: "fieldset",
            name: "whatsApp",
            class: "grid-3to1"
        },
        {
            element: "radio",
            legend: "Es gibt eine Nerdsweek-WhatsApp-Gruppe. Möchtest du Teil davon werden?",
            name: "joinWhatsApp",
            labels: [["Ich bin bereits Teil der Gruppe.", "alreadyIn"], ["Ja, ich möchte sehr gern hinzugefügt werden.", "yes"], ["Nein, ich möchte nicht hinzugefügt werden.", "no"]],
            fieldset: "whatsApp",
            get: player => player.data.joinWhatsApp, 
            set: (player, value) => { player.data.joinWhatsApp = value; },
            mandatory: true
        },

        {
            element: "checkbox",
            name: "agreeToJoin",
            label: "Hiermit bestätige ich meine Anmeldung bei der Nerdsweek 2027.",
            value: "agreeToJoin",
            get: player => player.data.agreeToJoin, 
            set: (player, value) => { player.data.agreeToJoin = value; },
            mandatory: true
        },
    ];
}

function createRankFields() {
    let fields = [];
    for (let i = 1; i <= 8; i++) {
        fields.push({
            element: "select",
            type: "text",
            name: `rank_${i}`,
            label: `Rang ${i}`,
            get: player => player["rank_" + i],
            set: (player, value) => { player["rank_" + i] = value; },
            options: "",
            mandatory: true
        });
    }
    return fields;
}

async function createAllFields() {
    const id = {
        name: "id",
        label: "ID",
        get: player => player.id
    };
    const personalDataFields = createFieldsForPersonalData();
    const logisticsFields = await createFieldsForLogistics();
    const otherFields = createFieldsForOther();
    const rankFields = createRankFields();
    return [id, ...personalDataFields, ...logisticsFields, ...otherFields];
}

export function insertUserData(fields, userData) {
    fields.forEach(field => {
        if (typeof field.get !== "function") {
            return;
        } else if (field.get(userData) === null) return;
        if (field.name === "timeslots") {
            document.querySelector(`input[name="timeslots"][value="${field.value}"]`).checked = field.get(userData);
        } else if (["checkbox"].includes(field.element) && field.name !== "timeslots") {
            document.querySelector(`input[value="${field.value}"]`).checked = field.get(userData);
        } else if (["radio"].includes(field.element)) {
            document.querySelector(`input[name="${field.name}"][value=${field.get(userData)}]`).checked = true;
        } else {
            document.getElementById(field.name).value = field.get(userData);
        };
    });
}

export function saveUserData(fields, player) {
    const userData = player;
    fields.forEach(field => {
        if (typeof field.set !== "function") {
            console.log("Meine Funktion funktioniert nicht.");
            return;
        }
        if (field.name === "timeslots") {
            const checkbox = document.querySelector(`input[name="timeslots"][value="${field.value}"]`);
            field.set(userData, checkbox.checked);
        } else if (["checkbox"].includes(field.element) && field.name !== "timeslots") {
            const checkbox = document.querySelector(`input[value="${field.value}"]`);
            field.set(userData, checkbox.checked)
        } else if (["radio"].includes(field.element)) {
            const value = document.querySelector(`input[name=${field.name}]:checked`)?.value;
            field.set(userData, value === "true" ? true
                                    : value === "false" ? false
                                    : value);
        } else {
            const input = document.getElementById(field.name);
            field.set(userData, input.value);
        };
    });

    return userData;
}

export async function createGamesOptions(fields) {
    const rankFields = fields.filter(field => field.element === "select");
    await refreshValues("games");
    const games = await getValues("games").sort((a, b) => a.title.localeCompare(b.title));
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

export function generateTableHead(tableHeadID, fields, values, tableFunction) {
    const tableHead = document.getElementById(tableHeadID);
    const headTr = document.createElement("tr");
    headTr.id = "headrow";
    fields.forEach(field => {
        const cellElement = document.createElement("th");
        cellElement.textContent = field.label;
        if (typeof tableFunction === "function") {
            cellElement.addEventListener("click", () => {
                const sortedValues = typeof values.sort === "function" ? values.sort(field.sort) : values;
                tableFunction(sortedValues);
            });
        }
        headTr.appendChild(cellElement);
    });
    tableHead.appendChild(headTr);
}

export async function generateTableBody(tableBodyID, dataType, buttons, fields, translate) {
    const tableBody = document.getElementById(tableBodyID);
    let translatedValues = [];
    let values;

    tableBody.innerHTML = "";
    if (Array.isArray(dataType)) {
        values = dataType;
    } else {
        await refreshValues(dataType);
        values = await getValues(dataType); //await response.json();
    }
    
    if ( translate ) {
        translatedValues = translateValues(values, dataType);
    } else {
        translatedValues = values;
    }
    
    translatedValues.forEach(value => {
        const row = document.createElement("tr");
        fields.forEach(getValue => {
            const cellElement = document.createElement("td");
            const cellContent = getValue.get(value) ?? "";
            cellElement.textContent = cellContent;
            row.appendChild(cellElement);
            });
        if (buttons.length > 0) {
            const cellElement = document.createElement("td");
            buttons.forEach(button => {
                const newButton = createButton(button.name, button.label, button.contentType, "", () => button.function(value));
                cellElement.appendChild(newButton);
                })
            row.appendChild(cellElement);
        };
        tableBody.appendChild(row);
    });
    return translatedValues;
}

export function addDataToDatabaseButton(fields, containerID, buttonID, buttonLabel, tableFunction, dataType, sendFunction, join) {
    //const fieldsWithoutID = fields.slice(1);
    const form = generateForm(fields, containerID);
    form.className = "standardForm";
    const formContainer = document.getElementById(containerID);
    //const firstName = document.getElementById("firstName").textContent ?? ;
    let clickMessage;
    const addDataToDatabaseButton = createButton(buttonID, buttonLabel, "text", "", async () => {
        const dataId = 0; // dataId wird später an den Server übergeben. Ist sie 0, sagt dies dem Server, dass der Datensatz neu in der Datenbank angelegt werden muss.
        await addDataToDatabase(dataId, fields, sendFunction, containerID, join);

        if (tableFunction !== "") {
            tableFunction();
        };
    });
    document.getElementById(containerID).appendChild(addDataToDatabaseButton);
}

export function calculateRatings(games, players) {
    let gamesRating = {};
    let playersChoseGame = {};
    games.forEach(game => {
        let points = 0;
        let playersChoseThisGame = [];
        players.forEach(player => {
            const ranks = Object.fromEntries(Object.entries(player.gamePreferences).filter(
                key => !["rank_excluded"].includes(key)
            ));
            for (const [key, value] of Object.entries(ranks)) {
                if (value === game.id) {
                    const rankNumber = Number(key.replace("rank_", ""));
                    const pointsOfPlayer = calculateRankingScoreForPlayer(rankNumber);
                    points = points + pointsOfPlayer;
                    playersChoseThisGame.push({
                        playerId: player.id,
                        rank: rankNumber
                    });
                }
            };   
        });
        gamesRating[game.id] = points;
        if (playersChoseThisGame.length > 0) {
            playersChoseGame[game.id] = playersChoseThisGame;
        }
    });
    return [gamesRating, playersChoseGame];
}

export function calculateRankingScoreForPlayer(rankNumber) {
    return Math.round( (9 - rankNumber) ** (1.5) * 100);
}

export function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

export function calculateAverage(array) {
    return array.reduce((sum, number) => sum + number, 0) / array.length;
}

export function setHexColor(property, hex) {
    const value = hex.replace("#", "");

    property.rgb(
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    );
}