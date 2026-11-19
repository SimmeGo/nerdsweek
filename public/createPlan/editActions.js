import { shiftPlayData, shiftPlayerData, removePlayerDataFromPlay } from "./modifyPlan.js";

export function initializeEditActions({ plays, updateTimeslotRow, updateSatisfactionScore, updateTableLayout }) {
    
    function shiftPlayer(sourcePlayId, targetPlayId, playerId) {
        const sourcePlay = plays.find(play => play.id === sourcePlayId);
        const targetPlay = plays.find(play => play.id === targetPlayId);
        
        const shiftResult = shiftPlayerData(sourcePlay, targetPlay, playerId);

        if (!shiftResult.success) {
            alert(shiftResult.message);
            return false;
        };

        [sourcePlay, targetPlay].forEach(datapoint => {
            datapoint.timeslot.forEach(slot => {
                const playsInSameTimeslot = plays.filter(play => play.timeslot.includes(slot));
                updateTimeslotRow(playsInSameTimeslot, slot, plays);
            });
        });

        updateSatisfactionScore(plays);

        return true;
    }

    function shiftPlay(playId, targetTimeslot, maxTimeslotId) {
        const draggedPlay = plays.find(play => play.id === playId);

        const sourceTimeslots = draggedPlay.timeslot;
        const targetTimeslots = assessTimeslot(draggedPlay.timeslotCount, targetTimeslot, maxTimeslotId);

        let targetPlays = [];
        targetTimeslots.forEach(slot => {
            const slotPlays = plays.filter(play => play.timeslot.includes(slot));
            targetPlays.push(slotPlays);
        });

        const shiftResult = shiftPlayData(targetTimeslots, targetPlays, draggedPlay);
        if (!shiftResult.success) {
            alert(shiftResult.message);
            return false;
        };

        console.log("Die Timeslots sind – Source:", sourceTimeslots, "–Target: ", targetTimeslots);

        [...sourceTimeslots, ...targetTimeslots].forEach(slot => {
            const playsInSameTimeslot = plays.filter(play => play.timeslot.includes(slot));
            console.log(slot);
            updateTimeslotRow(playsInSameTimeslot, slot, plays);
        });

        updateTableLayout(plays);

        updateSatisfactionScore(plays);
    }

    function assessTimeslot(timeslotCount, targetTimeslot, maxTimeslotId) {
        if (timeslotCount === 1) return [targetTimeslot];

        if (targetTimeslot === maxTimeslotId) return [targetTimeslot - 1, targetTimeslot];

        return [targetTimeslot, targetTimeslot + 1];
    }

    function removePlayer(playId, playerId) {
        const play = plays.find(play => play.id === playId);
        if (!play || play.playedGame === "Nicht zugeordnet") return;

        if (!removePlayerDataFromPlay(play, playerId)) {
            alert("Löschen des Spielers fehlgeschlagen.");
            return;
        };
        
        let playerFound = false;
        const playsOfTimeslot = plays.filter(p => p.timeslot.some(slot => play.timeslot.includes(slot)));
        playsOfTimeslot.forEach(thisPlay => {
            if (thisPlay.players.includes(playerId)) playerFound = true;
        });

        if (!playerFound) {
            playsOfTimeslot.find(play => play.playedGame === "Nicht zugeordnet").players.push(playerId);
        };

        for (const slot of play.timeslot) {
            const playsInTimeslot = plays.filter(play => play.timeslot.includes(slot));
            updateTimeslotRow(playsInTimeslot, slot, plays);
        };
        updateTableLayout(plays);
        
        updateSatisfactionScore(plays);
    }

    return { shiftPlayer, shiftPlay, removePlayer }
}