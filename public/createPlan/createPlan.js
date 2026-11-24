import { getValuesfromForm } from "../shared/data_management.js";
import { createButton, generateForm, createAndShowBackButton, calculateAverage } from "../shared/forms.js";
import { createPlanEvaluator } from "./createPlanEvaluator.js";
import { createPlanner } from "./createPlanner.js";

import { createPlanView } from "./planView.js";
import { getValues, refreshValues } from "/shared/data_management.js";

//Parameter für die Planung:
// ### oberste Priorität ###
// - Spiele, die von einem bestimmten Spieler gewählt wurden
// - Spielerzahl, die ein bestimmtes Spiel gewählt haben
// - Spielerzahl, für die ein Spiel geeignet ist (Daten aus game.playerCount werden genutzt, dabei wird versucht, eine präferierte Spielerzahl zu nutzen)
// ### mittlere Priorität ###
// - Zeitslots, zu dem ein Spieler anwesend ist (wir nehmen vorerst an, dass ein Spieler an allen Zeitslots teilnimmt, um den Algorithmus zu vereinfachen)
// - Tischzahl (es gibt eine maximale Tischzahl, die von parallel laufenden Spielen in Summe nicht überschritten werden darf)
// ### unterste Priorität ###
// - Spiellänge (Daten aus game.playTime werden genutzt, dabei wird versucht, ähnlich lange Spiele parallel laufen zu lassen)

let games = [];
let gameCards = [];
let players = [];
let timeslots = [];

let planEvaluator;
let planner;
let planView;

let TIMESLOTS;

let progressBar;
let progressText;

const buttons = [
    {name: "manualPlan", label: "Plan manuell erstellen", contentType: "text", class: "", method: {}},
    {name: "automatedPlan", label: "Plan erstellen lassen", contentType: "text", class: "", method: showPlanClosenessPreference},
    {name: "loadPlan", label: "erstellten Plan laden", contentType: "text", class: "", method: {}},
];

const backSvg = "M17.6 5.8 11.5 12l6.1 6.2m-5-12.4L6.5 12l6.1 6.2";

async function startAlgorithm(closenessValue) {

    const container = document.getElementById("buttonContainer");
    container.appendChild(progressBar);
    container.appendChild(progressText);

    const algorithmButton = document.getElementById("startAlgorithmButton");
    algorithmButton.disabled = true;
    
    const cycleCountValues = new Map([
        ["1", 100],
        ["2", 1000],
        ["3", 5000],
        ["4", 10000]
    ]);

    const cycleCount = cycleCountValues.get(closenessValue);
    const bestPlan = await planner.generateAndCyclePlans(cycleCount, showProgress);
    
    planView.displayResultsInTable(bestPlan);

    algorithmButton.disabled = false;
}

function showProgress(cycleNumber, cycleCount, bestPlan, isNewPlan) {
    const progress = cycleNumber / cycleCount * 100;
    progressBar.style.setProperty("--progress", `${progress}%`);
    if (!isNewPlan) return;
    progressText.textContent = `Neuer Plan gefunden, Ø-Zufriedenheit: ${Math.round(bestPlan.averageSatisfaction * 100) / 100}%`;
}

function showPlanClosenessPreference(sliderContainer) {
    sliderContainer.innerHTML = "";
    sliderContainer.className = "black-box slider-container";

    
    
    const closenessLabel = document.createElement("label");
    closenessLabel.className = "slider-wrapper";

    const labelText = document.createElement("span");
    //labelText.textContent = "Mach die Planerstellung";
    closenessLabel.appendChild(labelText);
    
    const closenessSlider = document.createElement("input");
    closenessSlider.id = "closenessSlider";
    closenessSlider.className = "closeness-slider";
    closenessSlider.type = "range";
    closenessSlider.min = 1;
    closenessSlider.max = 4;
    closenessSlider.value = 1;
    closenessSlider.step = 1;
    
    closenessLabel.appendChild(closenessSlider);
    
    const sliderLabels = [
        "sehr schnell",
        "schnell",
        "gründlich",
        "sehr gründlich"
    ];

    const labelsWrapper = document.createElement("div");
    labelsWrapper.className = "labels-wrapper";

    sliderLabels.forEach(label => {
        const span = document.createElement("span");
        span.textContent = label;
        span.className = "slider-label";
        labelsWrapper.appendChild(span);
    });

    closenessLabel.appendChild(labelsWrapper);

    sliderContainer.appendChild(closenessLabel);

    const startAlgorithmButton = createButton("startAlgorithmButton", "Plan erstellen", "text", "start-algorithm", () => {startAlgorithm(closenessSlider.value)});
    sliderContainer.appendChild(startAlgorithmButton);

    const backOneStepButton = document.getElementById("backOneStepButton");
    backOneStepButton.style.display = "block";

    const title = document.getElementById("menuTitle");
    title.textContent = "Wie soll der Plan erstellt werden?";
}

async function start() {
    const dataTypes = ["gameCards", "games", "players", "timeslots"];
    
    [gameCards, games, players, timeslots] = await Promise.all(
        dataTypes.map(async (dataType) => {
            await refreshValues(dataType);
            return getValues(dataType);
        })
    );
    console.log(players);

    TIMESLOTS = timeslots.map(timeslot => timeslot.id).filter(id => id !== 0);

    planEvaluator = createPlanEvaluator({ games, players, TIMESLOTS });
    planner = createPlanner( { players, games, TIMESLOTS, calculateSatisfactionScore: planEvaluator.calculateSatisfactionScore});

    const backButton = createAndShowBackButton("/admin", "planButtons");

    planView = createPlanView({
        games,
        players,
        timeslots,
        gameCards,
        calculateSatisfactionScore: planEvaluator.calculateSatisfactionScore,
    });
    const startContainer = document.createElement("div");
    startContainer.className = "start-container";
    const titleContainer = document.createElement("div");
    titleContainer.className = "title-container";

    const buttonContainer = document.createElement("div");
    buttonContainer.id = "buttonContainer";
    
    const backButtonContainer = document.createElement("div");
    const backOneStepButton = createButton("backOneStepButton", backSvg, "image", "menu-button", () => {createPlanOptions(startContainer, buttonContainer)});
    titleContainer.appendChild(backButtonContainer);
    backButtonContainer.appendChild(backOneStepButton);
    backOneStepButton.style.display = "none";

    const title = document.createElement("h2");
    title.id = "menuTitle";
    titleContainer.appendChild(title);
    startContainer.appendChild(titleContainer);

    document.getElementById("planBody").insertBefore(startContainer, document.getElementById("displayOptions"));

    const otherButtonContainer = document.createElement("div");
    titleContainer.appendChild(otherButtonContainer);

    progressBar = document.createElement("div");
    progressBar.id = "progressBar";
    progressBar.className = "progress-bar";
    progressText = document.createElement("span");
    progressText.id = "progressText";
    progressText.className = "progress-text";

    createPlanOptions(startContainer, buttonContainer);

}

function createPlanOptions(startContainer, buttonContainer) {
    const title = document.getElementById("menuTitle");
    title.textContent = "Was möchtest du tun?";

    buttonContainer.innerHTML = "";

    buttonContainer.className = "button-container";
    buttons.forEach(button => {
        const newButton = createButton(button.name, button.label, button.contentType, button.class, () => button.method(buttonContainer));
        newButton.className = "menu-button";
        buttonContainer.appendChild(newButton);
    });
    startContainer.appendChild(buttonContainer);
}

start();