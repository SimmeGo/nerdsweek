import { classifyFreeAndDoublePlayers, createCell, createPlayerSection, updateTimeslotColumn } from "./createPlan.js";

export function initializeContainerDragAndDrop(playContainer, plays) {
    
    playContainer.addEventListener("dragover", (event) => {
        
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";

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
        
        source.play = plays.find(play => play.id === source.playId);
        target.play = plays.find(play => play.id === target.playId);

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
                datapoint.playsInSameTimeslot = plays.filter(play => play.timeslot.includes(slot));
                updateTimeslotColumn(datapoint.playsInSameTimeslot, slot, plays);
            });
        });

        /*[source, target].forEach(datapoint => {
            datapoint.allTimeslots.forEach(slot => {
                datapoint.playContainer = document.querySelector(`.table-cell[data-play-id="${datapoint.playId}"][data-timeslot="${slot}"]`);
                console.log(datapoint.playContainer);
                datapoint.playerContainer = datapoint.playContainer.querySelector("div");
                let freePlayers;
                createPlayerSection(datapoint.play, datapoint.playerContainer, datapoint.playContainer, datapoint.doublePlayers);

                const notAssignedPlayContainer = document.querySelector(`.table-cell[data-cell-type="notAssigned"][data-timeslot="${slot}"]`);
                const notAssignedPlayerContainer = notAssignedPlayContainer.querySelector("div");
                const notAssignedPlay = plays.find(play => play.playedGame = "Nicht zugeordnet" && play.timeslot.includes(slot));
                createPlayerSection(notAssignedPlay, notAssignedPlayerContainer, notAssignedPlayContainer, datapoint.doublePlayers);
            });
        }); */

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
        const assignment = {
            playerId: event.currentTarget.dataset.playerId,
            playId: event.currentTarget.dataset.playId,
            timeslot: event.currentTarget.dataset.timeslot,
            allTimeslots: event.currentTarget.dataset.allTimeslots
        };

        console.log(assignment);

        event.dataTransfer.setData("text/plain", JSON.stringify(assignment));
        event.dataTransfer.effectAllowed = "move";

        console.log("Gezogener Spieler:", `${assignment.playerId}-${assignment.playId}`);
    });
}