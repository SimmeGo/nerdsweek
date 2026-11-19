function classifyPlayers(types, plays, players) {
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

const testPlayers = [
    { id: 1, gamePreferences: { rank_excluded: [] } },
    { id: 2, gamePreferences: { rank_excluded: [20] } },
    { id: 3, gamePreferences: { rank_excluded: [] } },
];

const testPlays = [
    { playedGame: 10, players: [1, 2] },
    { playedGame: 20, players: [2] },
];

const cases = [
    {
        types: ["free", "double", "excludedGame"],
        expected: [[3], [2], [2]],
    },
    {
        types: ["double", "free"],
        expected: [[2], [3]],
    },
];

for (const { types, expected } of cases) {
    const actual = classifyPlayers(types, testPlays, testPlayers);

    console.assert(
        JSON.stringify(actual) === JSON.stringify(expected),
        `Fehler bei ${types.join(", ")}`,
        { expected, actual }
    );
}