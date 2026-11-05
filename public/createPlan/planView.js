import { createButton, calculateAverage } from "../shared/forms.js";
import { initializeColumnDragAndDrop, initializeContainerDragAndDrop, initializePlayerDragAndDrop } from "./dragAndDrop.js";

let zoomSliderCreated = false;

// Jede Ansicht erhält ihre Daten ausdrücklich. Es entstehen keine globalen Variablen.
export function createPlanView({ games, players, timeslots, gameCards, onRemovePlayer, calculateSatisfactionScore, updateDoubleInfractions }) {


    function displayResultsInTable(bestPlan) {
        const fields = [];
        const playsPerTimeslot = [];
        

        const tableHead = document.getElementById("planTableHead");
        const tableBody = document.getElementById("planTableBody");
        tableHead.innerHTML = "";
        tableBody.innerHTML = "";

        for (const timeslot of timeslots) {
            const playsOfThisTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(timeslot.id));
            
            const [freePlayers] = classifyPlayers(["free"], playsOfThisTimeslot);

            const notAssigned = {
                id: bestPlan.plays.length + 1,
                playedGame: "Nicht zugeordnet",
                players: freePlayers,
                timeslot: [timeslot.id]
            };
            if(timeslot.id !== 0) {
                playsOfThisTimeslot.push(notAssigned);
                bestPlan.plays.push(notAssigned);
            };

            playsPerTimeslot.push(playsOfThisTimeslot);

            const column = {
                label: timeslot.id !== 0 ? `Zeitslot ${timeslot.id},\n ${timeslot.date} ${timeslot.startTime}` : "Nicht zugeordnet",
                id: timeslot.id,
            };

            fields.push(column);

            const tableColumn = document.createElement("div");
            tableColumn.className = "plan-column";
            tableColumn.id = timeslot.id;
            tableBody.appendChild(tableColumn);
            

            initializeColumnDragAndDrop(tableColumn, bestPlan, updateTimeslotColumn, updateSatisfactionScore);

            

            const cell = document.createElement("div");
            cell.className = "head-cell";
            const span = document.createElement("span");
            span.textContent = column.label;
            cell.appendChild(span);
            tableHead.appendChild(cell);

            

            updateTimeslotColumn(playsOfThisTimeslot, timeslot.id, bestPlan);

            
        };

        window.addEventListener("resize", () => {
            const titleSpans = document.querySelectorAll(".bold-text-in-table");
            titleSpans.forEach(span => {
                fitText(span);
            });
        });


        if (!zoomSliderCreated) {
            createZoomSlider();
            zoomSliderCreated = true;
        };
        
        updateSatisfactionScore(bestPlan);
        
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

        types.forEach(type => {
            classifiedPlayers[type] = [];
        });

        classifiedPlayers.occupied = [];

        plays.forEach(play => {
            play.players.forEach(player => {
                const thisPlayer = players.find(thisPlayer => thisPlayer.id === player);
                types.forEach(type => {
                    typeAssignment.get(type)(thisPlayer, play);
                });
            });
        });

        if (types.includes("free")) {
            players.forEach(player => {
                if (!classifiedPlayers.occupied.includes(player.id)) classifiedPlayers.free.push(player.id);
            });
        };

        types.forEach(type => {
            result.push(classifiedPlayers[type]);
        });
        
        function classifyFreePlayers(thisPlayer, play) {
            if (!classifiedPlayers.occupied.includes(thisPlayer.id)) classifiedPlayers.occupied.push(thisPlayer.id);
        }
        
        function classifyDoublePlayers(thisPlayer) {
            if (classifiedPlayers.occupied.includes(thisPlayer.id)) classifiedPlayers.double.push(thisPlayer.id);
            else classifiedPlayers.occupied.push(thisPlayer.id);
        }
        
        function classifyPlayersInExcludedGame(thisPlayer, play) {
            if (thisPlayer.gamePreferences.rank_excluded.includes(play.playedGame)) {
                classifiedPlayers.excludedGame.push(thisPlayer.id);
            };
        }
        
        return result;
    }

    function createCell(play, rowNumber, doublePlayers, playersInExcludedGame, timeslot, bestPlan) {
        
        if (!Object.keys(play).length) return "";

        const cellType = play.playedGame === "Nicht zugeordnet" ? "notAssigned" : "normal";
        const cellContainer = document.createElement("div");
        cellContainer.id = `cell${rowNumber + 1}-${timeslot}`;
        cellContainer.dataset.playId = play.id;
        cellContainer.dataset.type = "play";
        cellContainer.dataset.timeslot = timeslot;
        cellContainer.dataset.allTimeslots = JSON.stringify(play.timeslot);
        cellContainer.dataset.cellType = cellType;
        cellContainer.classList.add("table-cell");

        const playedGame = games.find(game => game.id === play.playedGame);
        if (playedGame) {
            if (!play.isValidPlayerCount(playedGame)) {
                cellContainer.classList.add("invalid-player-count");
            } else if (play.isPerfectPlayerCount(playedGame)) {
                cellContainer.classList.add("perfect-player-count");
            } else {
                cellContainer.classList.add("valid-player-count");
            };
        };
        
        const bgImage = gameCards.find(card => card.id === play.playedGame)?.gameCover;
        
        if (bgImage) {
            const bgImgElement = document.createElement("img");
            bgImgElement.className = "cell-img";
            bgImgElement.src = bgImage;
            bgImgElement.draggable = false;
            cellContainer.appendChild(bgImgElement);
        };

        const titleElement = document.createElement("span");
        titleElement.className = "bold-text-in-table"
        titleElement.textContent = playedGame?.title ?? play.playedGame;
        cellContainer.appendChild(titleElement);
        
        initializeContainerDragAndDrop(cellContainer, bestPlan, updateTimeslotColumn, updateSatisfactionScore, players);
        
        
        const playerContainer = document.createElement("div");
        playerContainer.id = `playerContainer${rowNumber + 1}-${timeslot}`;
        playerContainer.dataset.playId = play.id;
        playerContainer.className = "player-container";
        cellContainer.appendChild(playerContainer)
        
        createPlayerSection(play, playerContainer, cellContainer, doublePlayers, playersInExcludedGame, bestPlan.plays)

        return cellContainer;
    }

    function createPlayerSection(play, playerContainer, cellContainer, doublePlayers, playersInExcludedGame, plays) {
        const fullNames = [];
        const initialsNames = [];

        playerContainer.innerHTML = "";
        
        play.players.forEach(player => {
            const thisPlayer = players.find(p => p.id === player);

            const playerElement = createPlayerElement(play, thisPlayer, doublePlayers, playersInExcludedGame, cellContainer.dataset.timeslot);
        
            const [fullName, initialsName] = createPlayerName(play, thisPlayer);

            const span = document.createElement("span");
            playerElement.appendChild(span);
        
            initializePlayerDragAndDrop(playerElement);
        
            fullNames.push(fullName);
            initialsNames.push(initialsName);
            span.textContent = initialsName;
            playerContainer.appendChild(playerElement);
        });
        
        registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, cellContainer);
    }

    function createPlayerElement(play, thisPlayer, doublePlayers, playersInExcludedGame, timeslot) {
        const playerElement = document.createElement("span");
        playerElement.dataset.type = "player";
        playerElement.dataset.playId = play.id;
        playerElement.dataset.playerId = thisPlayer.id;
        playerElement.dataset.timeslot = timeslot;
        playerElement.dataset.allTimeslots = JSON.stringify(play.timeslot);
        if (doublePlayers.includes(thisPlayer.id) || playersInExcludedGame.includes(thisPlayer.id)) playerElement.className = "marked-player";
        playerElement.id = `player${thisPlayer.firstName}${thisPlayer.lastName.slice(0,1)}`;
        playerElement.style.backgroundColor = thisPlayer.color;

        const removeButton = createButton(`remove${thisPlayer.firstName}Button`, "x", "text", "remove-player-button roundButton", () => 
            onRemovePlayer(Number(playerElement.dataset.playId), Number(playerElement.dataset.playerId)));
        playerElement.appendChild(removeButton);
        

        return playerElement;
    }

    function updateTimeslotColumn(playsInTimeslot, timeslot, bestPlan) {
        updateUnassignedPlayers(playsInTimeslot, timeslot, bestPlan.plays);
        const [doublePlayers, playersInExcludedGame] = classifyPlayers(["double", "excludedGame"], playsInTimeslot);
        const tableColumn = document.getElementById(timeslot);
        tableColumn.innerHTML = "";
        playsInTimeslot.forEach((play, index) => {
            const cell = createCell(play, index, doublePlayers, playersInExcludedGame, timeslot, bestPlan)
            tableColumn.appendChild(cell);
            const titleElement = cell.querySelector(".bold-text-in-table");
        });

        const playsPerTimeslot = [];
        for (const timeslot of timeslots) {
            const playsOfThisTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(timeslot.id));

            playsPerTimeslot.push(playsOfThisTimeslot);
        };

        const columnCount = Math.max(... playsPerTimeslot.map(plays => plays.length));

        document.documentElement.style.setProperty("--columnCount", `${columnCount}`);

        const titleSpans = document.querySelectorAll(".bold-text-in-table");
        titleSpans.forEach(span => {
            fitText(span);
        });
    }

    function updateUnassignedPlayers(plays, timeslot, allPlays) {
        const index = plays.findIndex(play => play.playedGame === "Nicht zugeordnet");
        if (index === -1) {
            console.log("Kein passendes Play gefunden.");
            return;
        };
        const id = plays[index].id;
        plays.splice(index, 1);
        const [freePlayers] = classifyPlayers(["free"], plays);
        const notAssigned = {
            id: id,
            playedGame: "Nicht zugeordnet",
            players: freePlayers,
            timeslot: [timeslot]
        };
        plays.push(notAssigned);
        // Die Anzeige und der Plan verwenden dieselbe aktualisierte Zuordnung.
        //const planIndex = allPlays.findIndex(play => play.id === id);
        //if (planIndex !== -1) allPlays[planIndex] = notAssigned;
    }

    function createPlayerName(play, thisPlayer) {
        const playerName = `${thisPlayer.firstName} ${thisPlayer.lastName}`;
        const initials = `${thisPlayer.firstName.slice(0,1)}${thisPlayer.lastName.slice(0,1)}`;
        const rank = Object.entries(thisPlayer.gamePreferences)
            .find(([key, value]) => value === play.playedGame);
        const rankNumber = rank ? rank[0].replace("rank_", "") : "0";
        const fullName = `${playerName} (${rankNumber})`;
        const initialsName = `${initials} (${rankNumber})`;

        return [fullName, initialsName];
    }

    function registerListenerForExtendingPlayerNames(fullNames, initialsNames, playerContainer, cellContainer) {
        const spans = playerContainer.querySelectorAll(":scope > span");
        let showFull = true;

        cellContainer.addEventListener("click", () => {
            if (showFull) {
                //playerContainer.style.height = playerContainer.scrollHeight;
                spans.forEach((span, index) => {
                    const textSpan = span.querySelector(":scope > span");
                    textSpan.textContent = fullNames[index];
                    span.style.aspectRatio = "5 / 1";
                });
                playerContainer.style.gridTemplateColumns = "1fr";
                showFull = false;
            } else {
                playerContainer.style.height = "auto";
                spans.forEach((span, index) => {
                    const textSpan = span.querySelector(":scope > span");
                    textSpan.textContent = initialsNames[index];
                    span.style.aspectRatio = "1 / 1";
                });
                playerContainer.style.gridTemplateColumns = "repeat(var(--players-per-row), minmax(40px, 1fr))";
                showFull = true;
            };
        });
    }
    
    function updateSatisfactionScore(bestPlan) {
        bestPlan.playerSatisfaction = calculateSatisfactionScore(bestPlan.plays);
        bestPlan.averageSatisfaction = calculateAverage(Object.values(bestPlan.playerSatisfaction));

        console.log("Spielerzufriedenheit:", bestPlan.playerSatisfaction);
        
        const satisfactionContainer = document.getElementById("satisfactionOverview");
        satisfactionContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        satisfactionContainer.innerHTML = "";

        const averageDiv = document.createElement("div");
        averageDiv.id = "averageDiv";

        const span = document.createElement("span");
        const textContent = "Ø: \n " + Math.round(bestPlan.averageSatisfaction) + "%";
        span.textContent = textContent;
        span.className = "satisfaction-span";
        span.style.backgroundColor = "var(--primCol)";
        averageDiv.appendChild(span);

        const playerDiv = document.createElement("div");

        players.forEach(player => {
            const span = document.createElement("span");
            const textContent = player.firstName.slice(0, 1) + player.lastName.slice(0, 1) + ": " + Math.round(bestPlan.playerSatisfaction[player.id]) + "%";
            span.textContent = textContent;
            span.className = "satisfaction-span";
            span.style.backgroundColor = player.color;

            playerDiv.appendChild(span);
        });

        satisfactionContainer.appendChild(averageDiv);
        satisfactionContainer.appendChild(playerDiv);
    }

    function fitText(element) {
        const ctx = document.createElement("canvas").getContext("2d");
        const style = getComputedStyle(element);
        const container = element.parentElement;

        const fontSize = 16;
        ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;

        const textWidth = ctx.measureText(element.textContent).width;

        const containerStyle = getComputedStyle(container);
        const containerWidth = container.clientWidth
            - parseFloat(containerStyle.paddingLeft)
            - parseFloat(containerStyle.paddingRight);

        if (textWidth <= 0 || containerWidth <= 0) return;

        const newFontSize = Math.min(25, fontSize * containerWidth * 0.92 / textWidth);

        element.style.fontSize = `${newFontSize}px`;
    }

    return { displayResultsInTable, updateTimeslotColumn, updateSatisfactionScore };
}

