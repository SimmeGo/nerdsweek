import { createButton, generateForm } from "./forms.js";
import { setupInnerEdge } from "./css_coding.js";

export async function checkLogin() {
    const response = await fetch("/checkLogin");
    const userData = await response.json();
    console.log(userData.loggedIn);
    return userData;
};

export async function checkLoginStatus() {
    const loginSvg = "M6.224 21.17a4.04 4.04 0 1 0-.185-8.077 4.04 4.04 0 0 0 .185 8.077ZM9 14 20 3m-5.757 6.257 3.5 3.5 1.129-3.129L22 8.5 18.5 5";
    const navigationContainer = document.getElementById("navigationContainer");
    navigationContainer.innerHTML = "";
    const userData = await checkLogin();
    console.log(userData);

    checkLogoutStatus(navigationContainer);
    
    if (!!userData.loggedIn) {
        const fields = [
            {type: "a", action: "/admin", label: "Admin-Bereich"},
            {type: "a", action: "#", label: "Einstellungen"},
        ];
        
        //const buttons = [{type: "button", action: "/logout", label: "Abmelden"}];
        const userDialog = document.createElement("details");
        userDialog.id = "userDialog";
        userDialog.className = "user-dialog";
        const summary = document.createElement("summary");
        summary.textContent = userData.username;
        summary.className = "inner-edge";
        userDialog.appendChild(summary);
        const menu = document.createElement("div");
        menu.id = "menu";
        menu.className = "menu inner-edge";
        fields.forEach(field => {
            const menuEntry = document.createElement(field.type);
            menuEntry.textContent = field.label;
            menuEntry.href = field.action;
            menu.appendChild(menuEntry);
        });
        const button = document.createElement("button");
        button.textContent = "Ausloggen";
        button.id = "logoutButton";
        button.addEventListener("click", async () => {
            console.log("Klick!")
            logoutUser();
        });
        menu.appendChild(button);
        userDialog.appendChild(menu);
        navigationContainer.appendChild(userDialog);
        //const userButton = createButton("userButton", userData.username, "text", "user-button", () => {})
        //navigationContainer.appendChild(userButton);
        setupInnerEdge(menu);
        setupInnerEdge(summary);
    } else {
        const loginDialogButton = createButton("loginDialogButton", loginSvg, "image", "roundButton", () => {createLoginDialog()});
        navigationContainer.prepend(loginDialogButton);
    };
}    

export function createLoginDialog() {
    const fields = [
        {
            label: "Benutzername",
            name: "username",
            element: "input",
            type: "text",
            class: "navigation-login"
        },
        {
            label: "Passwort",
            name: "password",
            element: "input",
            type: "password",
            class: "navigation-login"
        }
    ]
    generateForm(fields, "navigationContainer");
    const loginButton = createButton("Login", "Anmelden", "text", "login-button", sendLoginData);
    document.getElementById("navigationContainer").appendChild(loginButton);
}

export async function sendLoginData() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    console.log(username, password);
    const response = await fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    });
    const result = await response.json();

    if (result.success) {
        //window.location.href = result.redirect;
        checkLoginStatus();
    }
}

export async function logoutUser() {
    console.log("Logout-Funktion!")
    const response = await fetch("/logout", {
        method: "POST"
    });
    const result = await response.json();
    if (result.success) {
        window.location.href = "/?logout=success";
    }
}

function checkLogoutStatus(navigationContainer) {
    const params = new URLSearchParams(window.location.search);

    if (params.get("logout") === "success") {
        const span = document.createElement("span");
        span.textContent = "Logout erfolgreich ausgeführt";
        navigationContainer.appendChild(span);
        params.delete(("logout"));
        const newUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, "", newUrl);
    };
}