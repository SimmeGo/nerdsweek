export function createButton(id, label, onClick) {
    const button = document.createElement("button");
    button.id = id;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
}

export function generateForm(fields, containerID) {
    const formContainer = document.getElementById(containerID);
    formContainer.innerHTML = ""; // Clear previous content

    const form = document.createElement("form");
    form.id = "gameForm";
    
    fields.forEach(field => {
        const div = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = field.label;
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