import { calculateAverage } from "../shared/forms.js";
import { createPlayCardCreator } from "./createPlayCardCreator.js";
import { initializeDragAndDrop } from "./dragAndDrop.js";
import { initializeEditActions } from "./editActions.js";

let zoomSliderCreated = false;

// Jede Ansicht erhält ihre Daten ausdrücklich. Es entstehen keine globalen Variablen.
export function createPlanView({ games, players, timeslots, gameCards, calculateSatisfactionScore }) {
    let dragAndDrop;
    let editActions;
    let playCardCreator;

    const ctx = document.createElement("canvas").getContext("2d");
    const measurementFontSize = 16;

    window.addEventListener("resize", () => {
        const titleSpans = document.querySelectorAll(".bold-text-in-table");
        titleSpans.forEach(span => {
            fitText(span);
        });
    });
    
    function displayResultsInTable(bestPlan) {
        const playsWithUnassignedPlayers = [... bestPlan.plays];
        
        editActions = initializeEditActions({ plays: playsWithUnassignedPlayers, updateTimeslotRow, updateSatisfactionScore, updateTableLayout });
        const maxTimeslotId = Math.max(... timeslots.map(timeslot => timeslot.id));
        dragAndDrop = initializeDragAndDrop({ shiftPlayer: editActions.shiftPlayer, shiftPlay: editActions.shiftPlay, maxTimeslotId, updateTimeslotRow, updateTableLayout });
        playCardCreator = createPlayCardCreator({ games, gameCards, players, dragAndDrop, editActions });

        const tableHead = document.getElementById("planTableHead");
        const tableBody = document.getElementById("planTableBody");
        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        for (const timeslot of timeslots) {
            const playsOfThisTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(timeslot.id));
            
            if(timeslot.id !== 0) {
                const highestId = Math.max(0, ... playsWithUnassignedPlayers.map(play => play.id));
                const notAssigned = {
                    id: highestId + 1,
                    playedGame: "Nicht zugeordnet",
                    players: [],
                    timeslot: [timeslot.id]
                };

                playsOfThisTimeslot.push(notAssigned);
                playsWithUnassignedPlayers.push(notAssigned);
            };
            
            const tableRow = document.createElement("div");
            tableRow.className = "plan-row";
            tableRow.id = timeslot.id;
            tableBody.appendChild(tableRow);
            
            dragAndDrop.row(tableRow);
            
            const cell = document.createElement("div");
            cell.className = "head-cell";
            const span = document.createElement("span");
            span.textContent = timeslot.id !== 0 ? `Zeitslot ${timeslot.id},\n ${timeslot.date} ${timeslot.startTime}` : "Nicht zugeordnet";
            cell.appendChild(span);
            tableHead.appendChild(cell);

            updateTimeslotRow(playsOfThisTimeslot, timeslot.id, playsWithUnassignedPlayers);
        };

        if (!zoomSliderCreated) {
            createZoomSlider();
            zoomSliderCreated = true;
        };

        updateTableLayout(playsWithUnassignedPlayers);
        
        updateSatisfactionScore(playsWithUnassignedPlayers);
    }
    
    function createZoomSlider() {
        const zoomLabel = document.createElement("label");
        zoomLabel.textContent = "Kacheln pro Partie: ";
    
        const zoomSlider = document.createElement("input");
        zoomSlider.type = "range";
        zoomSlider.min = 1;
        zoomSlider.max = 4;
        zoomSlider.value = 2;
        zoomSlider.step = 1;
    
        zoomSlider.addEventListener("input", () => {
            document.documentElement.style.setProperty("--players-per-row", zoomSlider.value);
        });
        zoomLabel.appendChild(zoomSlider);
        const zoomContainer = document.createElement("div");
        zoomContainer.id = "zoomContainer";
        zoomContainer.className = "zoom-container";
        zoomContainer.appendChild(zoomLabel);
        document.getElementById("formContainer").appendChild(zoomContainer);
    }

    function classifyPlayers(types, plays) {
        const typeAssignment = new Map([
            ["free", classifyFreePlayers],
            ["double", classifyDoublePlayers],
            ["excludedGame", classifyPlayersInExcludedGame]
        ]);

        const result = [];
        const classifiedPlayers = {};
        
        if (types.includes("free") || types.includes("double")) classifiedPlayers.occupied = plays.flatMap(play => play.players);
        
        types.forEach(type => {
            classifiedPlayers[type] = [];
            players.forEach(player => {
                typeAssignment.get(type)(player);
            });
        });

        types.forEach(type => {
            result.push(classifiedPlayers[type]);
        });
        
        function classifyFreePlayers(player) {
            if (!classifiedPlayers.occupied.includes(player.id)) classifiedPlayers.free.push(player.id);
        }
        
        function classifyDoublePlayers(player) {
            const playerCount = classifiedPlayers.occupied.filter(id => id === player.id).length;
            if (playerCount > 1) classifiedPlayers.double.push(player.id);
        }
        
        function classifyPlayersInExcludedGame(player) {
            const excludedGame = plays.find(play => player.gamePreferences.rank_excluded.includes(play.playedGame) && play.players.includes(player.id));
            if (excludedGame) {
                classifiedPlayers.excludedGame.push(player.id);
            };
        }
        
        return result;
    }

    function updateTimeslotRow(playsInTimeslot, timeslot, plays) {
        if (timeslot !== 0) updateUnassignedPlayers(playsInTimeslot);
        const [doublePlayers, playersInExcludedGame] = classifyPlayers(["double", "excludedGame"], playsInTimeslot);
        const tableRow = document.getElementById(timeslot);
        tableRow.innerHTML = "";
        playsInTimeslot.forEach((play, index) => {
            const playCard = playCardCreator.createPlayCard(play, index, doublePlayers, playersInExcludedGame, timeslot, plays)
            tableRow.appendChild(playCard);
        }); 
    }

    function updateTableLayout(plays) {
        const playsPerTimeslot = [];
        for (const timeslot of timeslots) {
            const playsOfThisTimeslot = plays.filter(play => play.timeslot.includes(timeslot.id));

            playsPerTimeslot.push(playsOfThisTimeslot);
        };

        const columnCount = Math.max(... playsPerTimeslot.map(plays => plays.length));

        document.documentElement.style.setProperty("--columnCount", `${columnCount}`);
        
        const titleSpans = document.querySelectorAll(".bold-text-in-table");
        titleSpans.forEach(span => fitText(span));
    }

    function updateUnassignedPlayers(plays) {
        const index = plays.findIndex(play => play.playedGame === "Nicht zugeordnet");
        if (index === -1) {
            console.log("Die Kategorie 'Nicht zugeordnet' wurde nicht gefunden.");
            return;
        };
        const [freePlayers] = classifyPlayers(["free"], plays.filter(play => play.id !== plays[index].id));
        plays[index].players = freePlayers;
    }
    
    function updateSatisfactionScore(plays) {
        const playerSatisfaction = calculateSatisfactionScore(plays);
        const averageSatisfaction = calculateAverage(Object.values(playerSatisfaction));

        console.log("Spielerzufriedenheit:", playerSatisfaction);
        
        const satisfactionContainer = document.getElementById("satisfactionOverview");
        satisfactionContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        satisfactionContainer.innerHTML = "";

        const averageDiv = document.createElement("div");
        averageDiv.id = "averageDiv";

        const span = document.createElement("span");
        const textContent = "Ø: \n " + Math.round(averageSatisfaction) + "%";
        span.textContent = textContent;
        span.className = "satisfaction-span";
        span.style.backgroundColor = "var(--primCol)";
        averageDiv.appendChild(span);

        const playerDiv = document.createElement("div");

        players.forEach(player => {
            const span = document.createElement("span");
            const textContent = player.firstName.slice(0, 1) + player.lastName.slice(0, 1) + ": " + Math.round(playerSatisfaction[player.id]) + "%";
            span.textContent = textContent;
            span.className = "satisfaction-span";
            span.style.backgroundColor = player.color;

            playerDiv.appendChild(span);
        });

        satisfactionContainer.appendChild(averageDiv);
        satisfactionContainer.appendChild(playerDiv);
    }

    function fitText(element) {
        const style = getComputedStyle(element);
        const container = element.parentElement;

        ctx.font = `${style.fontWeight} ${measurementFontSize}px ${style.fontFamily}`;

        const textWidth = ctx.measureText(element.textContent).width;

        const containerStyle = getComputedStyle(container);
        const containerWidth = container.clientWidth
            - parseFloat(containerStyle.paddingLeft)
            - parseFloat(containerStyle.paddingRight);

        if (textWidth <= 0 || containerWidth <= 0) return;

        const newFontSize = Math.min(25, measurementFontSize * containerWidth * 0.92 / textWidth);

        element.style.fontSize = `${newFontSize}px`;
    }

    return { displayResultsInTable };
}

