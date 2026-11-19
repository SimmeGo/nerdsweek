export function initializeDragAndDrop({ shiftPlayer, shiftPlay, maxTimeslotId, updateTimeslotRow, updateTableLayout }) {
    let draggedData;
    let lastPlayId;
    let lastRow = false;

    const DATA = { 
        INVALID: 1,
        WRONG_TYPE: 2,
        CORRECT: 3
    };
    
    function container(playContainer, plays, createPlayerName, players) {
        if (playContainer.dataset.playCardType !== "notAssigned") playContainer.draggable = true;
    
        playContainer.addEventListener("dragstart", (event) => {
            const assignment = {
                rowId: Number(event.currentTarget.id),
                playId: event.currentTarget.dataset.playId,
                timeslot: event.currentTarget.dataset.timeslot,
                type: event.currentTarget.dataset.type,
            };

            draggedData = assignment;
            
    
            event.dataTransfer.setData("text/plain", JSON.stringify(assignment));
            event.dataTransfer.effectAllowed = "move";
    
            console.log("Gezogenes Spiel:", `${assignment.playId}`);
        });
        
        playContainer.addEventListener("dragover", (event) => {
            if (draggedData?.type !== "player") return;
            
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            
            const sourcePlay = plays.find(play => play.id === Number(draggedData.playId));
            const targetPlay = plays.find(play => play.id === Number(event.currentTarget.dataset.playId));
            const playerId = Number(draggedData.playerId);
            
            if (sourcePlay.id === targetPlay.id ||
                lastPlayId === event.currentTarget.dataset.playId ||
                targetPlay.players.includes(playerId)
            ) return;
   
            lastPlayId = event.currentTarget.dataset.playId;
            lastRow = Number(event.currentTarget.dataset.timeslot);

            showPseudoplayer(playerId, playContainer.id, targetPlay);
        });

        playContainer.addEventListener("dragleave", (event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            removePseudoplayer();
        });

        playContainer.addEventListener("dragend", (event) => {
            removePseudoplayer();
            draggedData = null;
        });
        
        playContainer.addEventListener("drop", (event) => {
            event.preventDefault();
            
            const {result, parsedData: assignment} = parseRawData(event.dataTransfer.getData("text/plain"), "player");
            
            if (result === DATA.INVALID) {
                alert("Die eingefügten Daten sind nicht geeignet.");
                console.log("Invalid data dropped.");
                event.stopPropagation();
                return;
            } else if (result === DATA.WRONG_TYPE) return;
    
            const sourcePlayId = Number(assignment.playId);
            const targetPlayId = Number(event.currentTarget.dataset.playId);    
            const playerId = Number(assignment.playerId);
    
            shiftPlayer(sourcePlayId, targetPlayId, playerId);
        });

        function showPseudoplayer(playerId, containerId, targetPlay) {
            const player = players.find(player => player.id === playerId);

            const [, playerName] = createPlayerName(targetPlay, player);
            const playerElement = document.createElement("span");
            playerElement.textContent = playerName;
            
            if (player.gamePreferences.rank_excluded.includes(targetPlay.playedGame)) playerElement.className = "excluded-pseudo-player";
            else playerElement.className = "pseudo-player";

            const playContainer = document.getElementById(containerId);
            const playerContainer = playContainer.querySelector(":scope div[data-play-id='" + targetPlay.id + "']");
            playerContainer.appendChild(playerElement);
        }
        
        function removePseudoplayer() {
            if (lastRow === false) return;
    
            updateTimeslotRow(plays.filter(play => play.timeslot.includes(lastRow)), lastRow, plays);

            updateTableLayout(plays);
    
            lastRow = false;
            lastPlayId = false;
        }
    }
    
    function player(playerElement) {
        playerElement.draggable = true;
    
        playerElement.addEventListener("dragstart", (event) => {
            event.stopPropagation();
    
            const assignment = {
                playerId: event.currentTarget.dataset.playerId,
                playId: event.currentTarget.dataset.playId,
                timeslot: event.currentTarget.dataset.timeslot,
                type: event.currentTarget.dataset.type,
            };
    
            draggedData = assignment;
    
            event.dataTransfer.setData("text/plain", JSON.stringify(assignment));
            event.dataTransfer.effectAllowed = "move";
    
            console.log("Gezogener Spieler:", `${assignment.playerId}-${assignment.playId}`);
        });
    }
    
    function row(row) {
        row.addEventListener("dragover", (event) => {
            
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
    
        });
        
        row.addEventListener("drop", (event) => {
            const {result, parsedData: assignment} = parseRawData(event.dataTransfer.getData("text/plain"), "play");

            if (result === DATA.INVALID) {
                alert("Die eingefügten Daten sind nicht geeignet.");
                console.log("Invalid data dropped.");
                return;
            } else if (result === DATA.WRONG_TYPE) return;
            
            event.preventDefault();
    
    
            const sourceRowId = Number(assignment.timeslot);
            const targetRowId = Number(event.currentTarget.id);
            const playId = Number(assignment.playId);
    
            if (sourceRowId === targetRowId) return;

            shiftPlay(playId, targetRowId, maxTimeslotId);
        });
    }

    function parseRawData(rawData, dataType) {
        let assignment;
            
        try {
            assignment = JSON.parse(rawData);
        } catch (error) {
            console.error("Kein gültiges JSON-Format erkannt!");
            return {result: DATA.INVALID};
        };

        if (!assignment?.type) {
            return {result: DATA.INVALID};
        };

        if (assignment.type !== dataType) return {result: DATA.WRONG_TYPE};

        return {
            result: DATA.CORRECT,
            parsedData: assignment
        };
    }

    return { row, player, container };
}
