import { createButton } from "/shared/forms.js";

const adminBody = document.getElementById("adminBody");

const buttons = [
    {name: "viewGamesButton", label: "Spiele ansehen", relocate: () => {window.location.href = "/admin/spiele"}},
    {name: "viewPlayersButton", label: "Teilnehmer ansehen", relocate: () => {window.location.href = "/admin/teilnehmer"}},
    {name: "viewRankingsButton", label: "Spieleranking ansehen", relocate: () => {window.location.href = "/admin/spieleranking"}},
    {name: "planNerdsweekButton", label: "Nerdsweek planen", relocate: () => {window.location.href = "/admin/nerdsweekplanung"}},
    {name: "logoutButton", label: "Logout", relocate: () => {}}
]

function buildUpSite() {
    buttons.forEach(button => {
        const newButton = createButton(button.name, button.label, button.relocate);
        adminBody.appendChild(newButton);
        adminBody.appendChild(document.createElement("br"));
    });
    console.log(adminBody);
}

buildUpSite();