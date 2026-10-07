import { createButton } from "../shared/forms.js";
import { logoutUser } from "../shared/user_management.js";

const adminBody = document.getElementById("adminBody");
const logoutSvg = "m6.5 8-4 4 4 4m-4-4h13M14 6V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2v-1";

const buttons = [
    {name: "viewGamesButton", label: "Spiele ansehen", contentType: "text", class: "", relocate: () => {window.location.href = "/admin/spiele"}},
    {name: "viewPlayersButton", label: "Teilnehmer ansehen", contentType: "text", class: "", relocate: () => {window.location.href = "/admin/teilnehmer"}},
    {name: "viewRankingsButton", label: "Spiele\u200Branking ansehen", contentType: "text", class: "", relocate: () => {window.location.href = "/admin/spieleranking"}},
    {name: "planNerdsweekButton", label: "Nerdsweek planen", contentType: "text", class: "", relocate: () => {window.location.href = "/admin/nerdsweekplanung"}},
    {name: "logoutButton", label: logoutSvg, contentType: "image", class: "", relocate: async () => {logoutUser()}}
]

function buildUpSite() {
    const buttonContainer = document.createElement("div");
    buttonContainer.id = "buttonContainer";
    buttonContainer.className = "button-container";
    buttons.forEach(button => {
        const newButton = createButton(button.name, button.label, button.contentType, button.class, button.relocate);
        newButton.className = "menu-button";
        buttonContainer.appendChild(newButton);
        //adminBody.appendChild(document.createElement("br"));
    });
    adminBody.appendChild(buttonContainer);
    console.log(adminBody);
}

buildUpSite();