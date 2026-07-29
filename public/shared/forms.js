import { addDataToDatabase } from "/shared/data_management.js";

export function createButton(id, label, onClick) {
    const button = document.createElement("button");
    button.id = id;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

export function createAndShowBackButton(destination, insertBefore, bodyId) {
    const backButton = createButton("backButton", "<", () => {window.location.pathname = destination});
    document.getElementById(bodyId).insertBefore(backButton, document.getElementById(insertBefore));
}

export function generateForm(fields, containerID) {
    const formContainer = document.getElementById(containerID);
    formContainer.innerHTML = ""; // Clear previous content

    const form = document.createElement("form");
    form.id = "gameForm";
    
    fields.forEach(field => {
        const div = document.createElement("div");
        const label = document.createElement("label");
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
            if ( field.multiple ) {
                select.multiple = true; // Allow multiple selections
            }
            field.options.forEach((option, index) => {
                const optionElement = document.createElement("option");
                optionElement.value = option;
                optionElement.textContent = option;
                optionElement.focus
                select.appendChild(optionElement);
            });
            div.appendChild(select);
        } else if (field.element === "input") {
            const input = document.createElement("input");
            input.type = field.type;
            input.name = field.name;
            input.id = field.name;
            div.appendChild(input);
        }
        form.appendChild(div);
    });

    formContainer.appendChild(form);
}

export function createFieldsForPlayer() {
    let fields = [
        { name: "id", label: "ID", get: player => player.id },
        { element: "input", type: "text", name: "name", label: "Vorname", get: player => player.firstName},
        { element: "input", type: "text", name: "surname", label: "Nachname", get: player => player.lastName}
    ]
    for (let i = 1; i <= 8; i++) {
        fields.push({ element: "select", type: "text", name: `rank${i}`, label: `Rang ${i}`, get: player => player["rank" + i], options: "" });    
    }
    console.log(fields);
    return fields;
}

export function generateTableHead(tableHeadID, fields) {
    const tableHead = document.getElementById(tableHeadID);
    const headTr = document.createElement("tr");
    headTr.id = "headrow";
    fields.forEach(field => {
        const cellElement = document.createElement("th");
        cellElement.textContent = field.label;
        headTr.appendChild(cellElement);
    });
    const cellElement = document.createElement("th");
        cellElement.textContent = "Aktionen";
        headTr.appendChild(cellElement);
    tableHead.appendChild(headTr);
}

export async function generateTableBody(tableBodyID, fetchDestination, buttons, fields) {
    const tableBody = document.getElementById(tableBodyID);
    const response = await fetch(fetchDestination);
    tableBody.innerHTML = "";
    const values = await response.json();
    values.forEach(value => {
        const column = document.createElement("tr");
        fields.forEach(getValue => {
            const cellElement = document.createElement("td");
            cellElement.textContent = getValue.get(value) ?? "";
            column.appendChild(cellElement);
            });
        const cellElement = document.createElement("td");
        buttons.forEach(button => {
            const newButton = createButton(button.name, button.label, () => button.function(value));
            cellElement.appendChild(newButton);
            })
        column.appendChild(cellElement);
        tableBody.appendChild(column);
    });
    return values;
}

export function addDataToDatabaseButton(fields, containerID, buttonID, buttonLabel, tableFunction, dataType, sendFunction) {
    //const fieldsWithoutID = fields.slice(1);
    generateForm(fields, containerID);
    const formContainer = document.getElementById(containerID);
    const addDataToDatabaseButton = createButton(buttonID, buttonLabel, async () => {
        const dataId = 0; // dataId wird später an den Server übergeben. Ist sie 0, sagt dies dem Server, dass das Spiel neu in der Datenbank angelegt werden muss.
        await addDataToDatabase(dataId, fields, sendFunction, containerID);
        tableFunction();
    });
    document.getElementById(containerID).appendChild(addDataToDatabaseButton);
}