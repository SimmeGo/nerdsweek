let draggedData;
let lastPlayId;

export function initializeContainerDragAndDrop(playContainer, bestPlan, updateTimeslotColumn, updateSatisfactionScore, players) {
    if (playContainer.dataset.cellType !== "notAssigned") playContainer.draggable = true;

    playContainer.addEventListener("dragstart", (event) => {
        const assignment = {
            columnId: Number(event.currentTarget.id),
            playId: event.currentTarget.dataset.playId,
            timeslot: event.currentTarget.dataset.timeslot,
            allTimeslots: event.currentTarget.dataset.allTimeslots,
            type: event.currentTarget.dataset.type,
        };
        
        console.log(assignment);

        event.dataTransfer.setData("text/plain", JSON.stringify(assignment));
        event.dataTransfer.effectAllowed = "move";

        console.log("Gezogenes Spiel:", `${assignment.playId}`);
    });

    playContainer.addEventListener("dragover", (event) => {
        
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

        if (lastPlayId === event.currentTarget.dataset.playId) return;
        console.log(lastPlayId, "->", event.currentTarget.dataset.playId);

        lastPlayId = event.currentTarget.dataset.playId;

        const assignment = draggedData;

        const source = {
            playId: Number(assignment.playId),
            timeslot: Number(assignment.timeslot),
            allTimeslots: JSON.parse(assignment.allTimeslots),
        };

        const target = {
            playId: Number(event.currentTarget.dataset.playId),
            timeslot: Number(event.currentTarget.dataset.timeslot),
            allTimeslots: JSON.parse(event.currentTarget.dataset.allTimeslots),
        };

        const playerId = Number(assignment.playerId);
        const player = players.find(player => player.id === playerId);

        updateTimeslotColumn(bestPlan.plays.filter(play => play.timeslot.includes(target.timeslot)), target.timeslot, bestPlan);

        if (source.playId === target.playId) return;

        source.play = bestPlan.plays.find(play => play.id === source.playId);
        target.play = bestPlan.plays.find(play => play.id === target.playId);

        const containerId = playContainer.id;

        if (!target.play.players.includes(playerId)) {
            const fullRank = Object.entries(player.gamePreferences).find(([, game]) => {
                if (typeof game === "number") {
                    return game === target.play.playedGame;
                } else return game.includes(target.play.playedGame);
            }) ?? ["rank_preferred"];
            console.log(fullRank);
            const rank = fullRank[0] === "rank_excluded" ? -1
                : fullRank[0] === "rank_preferred" ? 0
                : Number(fullRank[0].replace("rank_", ""));
            const playerElement = document.createElement("span");
            playerElement.textContent = `${player.firstName.slice(0, 1)}${player.lastName.slice(0, 1)} (${rank})`;
            playerElement.className = "pseudo-player";
            const playContainer = document.getElementById(containerId);
            const playerContainer = playContainer.querySelector(":scope div[data-play-id='" + target.playId + "']");
            console.log("Player Container:", playerContainer, "Player Element:", playerElement);
            playerContainer.appendChild(playerElement);
        };
    });
    
    playContainer.addEventListener("drop", (event) => {
        event.preventDefault();

        const rawData = event.dataTransfer.getData("text/plain");

        const assignment = JSON.parse(rawData);

        const source = {
            playId: Number(assignment.playId),
            timeslot: Number(assignment.timeslot),
            allTimeslots: JSON.parse(assignment.allTimeslots),
        };

        const target = {
            playId: Number(event.currentTarget.dataset.playId),
            timeslot: Number(event.currentTarget.dataset.timeslot),
            allTimeslots: JSON.parse(event.currentTarget.dataset.allTimeslots),
        };

        const playerId = Number(assignment.playerId);

        if (source.playId === target.playId) return;
        
        source.play = bestPlan.plays.find(play => play.id === source.playId);
        target.play = bestPlan.plays.find(play => play.id === target.playId);

        if (target.play.players.includes(playerId)) {
            alert("Dieser Spieler ist in diesem Spiel bereits eingetragen");
            return;
        };

        const index = source.play.players.findIndex(player => player === playerId);
        
        if (index !== -1) {
            source.play.players.splice(index, 1);
            target.play.players.push(playerId);
            console.log({
                originPlayPlayers: source.play.players,
                newPlayPlayers: target.play.players
            });
        };
        [source, target].forEach(datapoint => {
            datapoint.allTimeslots.forEach(slot => {
                datapoint.playsInSameTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(slot));
                updateTimeslotColumn(datapoint.playsInSameTimeslot, slot, bestPlan);
            });
        });

        updateSatisfactionScore(bestPlan);

        console.log({
            playerId: playerId,
            source: source,
            target: target
        });

    });
}

export function initializePlayerDragAndDrop(playerElement) {
    playerElement.draggable = true;

    playerElement.addEventListener("dragstart", (event) => {
        event.stopPropagation();

        const assignment = {
            playerId: event.currentTarget.dataset.playerId,
            playId: event.currentTarget.dataset.playId,
            timeslot: event.currentTarget.dataset.timeslot,
            allTimeslots: event.currentTarget.dataset.allTimeslots,
            type: event.currentTarget.dataset.type,
        };

        draggedData = assignment;

        console.log(assignment);

        event.dataTransfer.setData("text/plain", JSON.stringify(assignment));
        event.dataTransfer.effectAllowed = "move";

        console.log("Gezogener Spieler:", `${assignment.playerId}-${assignment.playId}`);
    });
}

export function initializeColumnDragAndDrop(column, bestPlan, updateTimeslotColumn, updateSatisfactionScore) {
    column.addEventListener("dragover", (event) => {
        
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

    });
    
    column.addEventListener("drop", (event) => {
        event.preventDefault();

        const rawData = event.dataTransfer.getData("text/plain");

        const assignment = JSON.parse(rawData);

        //if (assignment.type !== "play") return;

        const source = {
            columnId: Number(assignment.timeslot)
        };
        
        const target = {
            columnId: Number(event.currentTarget.id),
        };

        
        const playId = Number(assignment.playId);
        console.log("playId=", playId);
        const gameId = bestPlan.plays.find(play => play.id === playId).playedGame;

        if (source.columnId === target.columnId) return;
        
        [source, target].forEach(datapoint => {
            datapoint.column = document.getElementById(datapoint.columnId);
            datapoint.playsInSameTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(datapoint.columnId));
            console.log(datapoint.playsInSameTimeslot);
        });

        for (const play of target.playsInSameTimeslot) {
            console.log(play.playedGame, "vs", gameId);
            if (play.playedGame === gameId) {
                alert("Dieses Spiel ist in diesem Zeitslot bereits eingetragen!");
                return;
            };
        };

        const draggedPlay = bestPlan.plays.find(play => play.id === playId);
        source.allTimeslots = draggedPlay.timeslot;
        draggedPlay.timeslot = [];
        
        for (let i = 0; i < draggedPlay.timeslotCount; i++) {
            draggedPlay.timeslot.push(target.columnId + i);
        };

        target.allTimeslots = draggedPlay.timeslot;


        [source, target].forEach(datapoint => {
            datapoint.allTimeslots.forEach(slot => {
                datapoint.playsInSameTimeslot = bestPlan.plays.filter(play => play.timeslot.includes(slot));
                updateTimeslotColumn(datapoint.playsInSameTimeslot, slot, bestPlan);
            });
        });

        updateSatisfactionScore(bestPlan);

        console.log({
            sourceTimeslotPlays: source.playsInSameTimeslot.map(play => play.id).join(", "),
            newTimeslotPlays: target.playsInSameTimeslot.map(play => play.id).join(", ")
        });
    });
}