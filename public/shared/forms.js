import { addDataToDatabase, getValues, refreshValues, translateValues } from "/shared/data_management.js";

export function createButton(id, label, contentType, cssClass, onClick) {
    const button = document.createElement("button");
    button.id = id;
    //button.textContent = label;
    button.className = cssClass;
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
    formContainer.innerHTML = ""; // Clear previous content

    const form = document.createElement("form");
    form.id = "gameForm";
    
    fields.forEach(field => {
        const div = document.createElement("div");
        const label = document.createElement("label");
        label.className = field.class;
        if ( field.mandatory ) {
            label.textContent = `${field.label}*`
        } else {
            label.textContent = field.label;
        };
        label.setAttribute("for", field.name);
        div.appendChild(label);

        if (field.element === "select") {
            const select = document.createElement("select");
            select.name = field.name;
            select.id = field.name;
            select.className = field.class;
            if ( field.multiple ) {
                select.multiple = true; // Allow multiple selections
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
            div.appendChild(select);
        } else if (field.element === "input") {
            const input = document.createElement("input");
            input.type = field.type;
            input.name = field.name;
            input.id = field.name;
            input.className = field.class;
            div.appendChild(input);
        }
        form.appendChild(div);
    });

    formContainer.appendChild(form);
}

export function createFieldsForPlayer() {
    let fields = [
        { name: "id", label: "ID", get: player => player.id },
        { element: "input", type: "text", name: "name", label: "Vorname", get: player => player.firstName, mandatory: true},
        { element: "input", type: "text", name: "surname", label: "Nachname", get: player => player.lastName, mandatory: true}
    ]
    for (let i = 1; i <= 8; i++) {
        fields.push({ element: "select", type: "text", name: `rank${i}`, label: `Rang ${i}`, get: player => player["rank" + i], options: "", mandatory: true });    
    }
    console.log(fields);
    return fields;
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
        cellElement.addEventListener("click", () => {
            console.log(values);
            const sortedValues = values.sort(field.sort);
            tableFunction(sortedValues);
        });
        headTr.appendChild(cellElement);
    });
    const cellElement = document.createElement("th");
        cellElement.textContent = "Aktionen";
        headTr.appendChild(cellElement);
    tableHead.appendChild(headTr);
}

export async function generateTableBody(tableBodyID, dataType, buttons, fields, translate) {
    const tableBody = document.getElementById(tableBodyID);
    let translatedValues = [];
    let values;
    //const response = await fetch(fetchDestination);
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
    console.log(fields);
    translatedValues.forEach(value => {
        const column = document.createElement("tr");
        fields.forEach(getValue => {
            const cellElement = document.createElement("td");
            cellElement.textContent = getValue.get(value) ?? "";
            column.appendChild(cellElement);
            });
        const cellElement = document.createElement("td");
        buttons.forEach(button => {
            const newButton = createButton(button.name, button.label, button.contentType, "", () => button.function(value));
            cellElement.appendChild(newButton);
            })
        column.appendChild(cellElement);
        tableBody.appendChild(column);
    });
    return translatedValues;
}

export function addDataToDatabaseButton(fields, containerID, buttonID, buttonLabel, tableFunction, dataType, sendFunction, join) {
    //const fieldsWithoutID = fields.slice(1);
    generateForm(fields, containerID);
    const formContainer = document.getElementById(containerID);
    const firstName = document.getElementById("name").textContent;
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
            const ranks = Object.fromEntries(Object.entries(player).filter(
                ([key]) => key.includes("rank")
            ));
            for (const [key, value] of Object.entries(ranks)) {
                if (value === game.id) {
                    const rankNumber = Number(key.replace("rank", ""));
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
    return Math.round( (9 - rankNumber) ** (1 / 1.5) * 100);
}

export function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}