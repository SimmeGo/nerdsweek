export function shiftPlayerData(sourcePlay, targetPlay, playerId) {
    if (sourcePlay.id === targetPlay.id) return {
        success: false,
        message: "Verschiebevorgang abgebrochen: Die Partie ist die gleiche, in der der Spieler bereits vorher war."
    };

    if (targetPlay.players.includes(playerId)) {
        return {
            success: false,
            message: "Verschiebevorgang abgebrochen: Dieser Spieler ist in dieser Partie bereits eingetragen."
        };
    };
    
    const index = sourcePlay.players.findIndex(player => player === playerId);
        
    if (index === -1) return {
        success: false,
        message: "Fehler: Der Spieler wurde in der Ausgangspartie nicht gefunden."
    };

    sourcePlay.players.splice(index, 1);
    targetPlay.players.push(playerId);
    console.log({
        originPlayPlayers: sourcePlay.players,
        newPlayPlayers: targetPlay.players
    });
    
    return {success: true};
}

export function shiftPlayData(timeslots, targetPlays, draggedPlay) {
        
    const gameId = draggedPlay.playedGame;

    for (const playsPerTimeslot of targetPlays) {
        for (const play of playsPerTimeslot) {
            if (play.playedGame === gameId && play.id !== draggedPlay.id) {
                console.log(play.playedGame, "vs", gameId);
                return {
                    success: false,
                    message: "Jedes Spiel darf pro Zeitslot nur einmal gespielt werden. Dieses Spiel ist in diesem Zeitslot bereits eingetragen."
                };
            };
        };
    };

    draggedPlay.timeslot = timeslots;

    return {success: true};
}

export function removePlayerDataFromPlay(play, playerId) {
    const index = play.players.indexOf(playerId);
    if (index === -1) return false;
    play.players.splice(index, 1);
    return true;
}