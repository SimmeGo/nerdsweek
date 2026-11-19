import { getValuesfromForm } from "../shared/data_management.js";
import { createButton, generateForm, createAndShowBackButton, calculateAverage } from "../shared/forms.js";
import { createPlanEvaluator } from "./createPlanEvaluator.js";
import { createPlanner } from "./createPlanner.js";
import { initializeEditActions } from "./editActions.js";

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

const containerId = "formContainer";
const fields = [
    {
        element: "number",
        label: "Anzahl an Durchläufen",
        name: "cycleCount",
    }
];

function startAlgorithm() {
    const cycleCount = getValuesfromForm(fields);
    const bestPlan = planner.generateAndCyclePlans(cycleCount);
    
    planView.displayResultsInTable(bestPlan);
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

    generateForm(fields, containerId);
    const startAlgorithmButton = createButton("startAlgorithm", "Starte Algorithmus", "text", "", () => {startAlgorithm()});
    document.getElementById(containerId).appendChild(startAlgorithmButton);
    const backButton = createAndShowBackButton("/admin", "planButtons");

    planView = createPlanView({
        games,
        players,
        timeslots,
        gameCards,
        calculateSatisfactionScore: planEvaluator.calculateSatisfactionScore,
    });
}

start();
