import {shuffle} from "../shared/forms.js";

export function assignPlaysToTimeslot({ plays, players, games, TIMESLOTS }) {
    const RANKS = TIMESLOTS;
    const lastSlot = Math.max(... TIMESLOTS);

    for (const rank of RANKS) {
        for (const player of shuffle([...players])) {
            const gameId = player.gamePreferences[`rank_${rank}`];

            if (gameId === 0) continue;

            const play = findPlayForPlayerAndGame(player.id, gameId);
            const thisGame = games.find(game => game.id === gameId);

            if (!play || play.timeslot !== null || play.isValidPlayerCount(thisGame) === false) {
                continue;
            };
            play.timeslot = chooseTimeslot(play.timeslotCount, play.players, play.playedGame);
        }
    }
    for (const play of plays.filter(play => play.timeslot === null)) {
        play.timeslot = chooseTimeslot(play.timeslotCount, play.players, play.playedGame);
    }

    assessPlaysWithInvalidPlayCount();


    function findPlayForPlayerAndGame(playerId, gameId) {
        return plays.find(play =>
            play.playedGame === gameId &&
            play.players.includes(playerId)
        );
    }
    
    function chooseTimeslot(timeslotCount, players, playedGame) {
        const playCountsPerTimeslotAndPlayer = countPlaysPerTimeslotAndPlayer();
        const freeTimeslotsForPlayers = findFreeTimeslotsForPlayers(playCountsPerTimeslotAndPlayer, players);
    
        //Jedes Spiel darf nur einmal pro Zeitslot vorkommen
        const playCountsPerTimeslotAndGame = countPlaysPerTimeslotAndGame();
        const freeTimeslotsForGames = findFreeTimeslotsForGames(playCountsPerTimeslotAndGame, playedGame);
    
        let bestTimeslots = freeTimeslotsForPlayers.filter((timeslot) => freeTimeslotsForGames.includes(timeslot));
        let leastConflictedTimeslots = [];
        if (bestTimeslots.length === 0) {
            const conflictsPerTimeslot = countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, players);
            while (bestTimeslots.length === 0) {
                for (const timeslot of leastConflictedTimeslots) {
                    delete conflictsPerTimeslot[timeslot];
                };
                leastConflictedTimeslots = Object.entries(conflictsPerTimeslot)
                    .filter(([, conflictCount]) => conflictCount === Math.min(...Object.values(conflictsPerTimeslot)))
                    .map(([timeslot]) => Number(timeslot));
    
                bestTimeslots = leastConflictedTimeslots.filter((timeslot) => freeTimeslotsForGames.includes(timeslot));
            };
        };
    
        const leastOccupiedTimeslots = findLeastOccuppiedTimeslots(bestTimeslots);
        const shuffledSlots = shuffle(leastOccupiedTimeslots);
    
        //const playerCounts = countPlayersPerTimeslot();
        //const leastOccupiedSlots = findLeastOccuppiedTimeslots(playerCounts);
    
        if (timeslotCount === 1) {
            return [shuffledSlots[0]];
        };
    
        return chooseTwoConsecutiveTimeslots(shuffledSlots, playCountsPerTimeslotAndPlayer, players);
    }
    
    function countPlaysPerTimeslotAndPlayer() {
        const counts = Object.fromEntries(
            TIMESLOTS.map(timeslot => [timeslot])
        );
        for (const timeslot of TIMESLOTS) {
            counts[timeslot] = Object.fromEntries(
                players.map(player => [player.id, 0])
            );
            const playsInTimeslot = findPlaysForTimeslot(timeslot);
            if (!Array.isArray(playsInTimeslot)) continue;
            for (const play of playsInTimeslot) {
                for (const player of play.players) {
                    counts[timeslot][player] = (counts[timeslot][player] ?? 0) + 1;
                }
            }
        }
    
        return counts;
    }
    
    function findFreeTimeslotsForPlayers(playerCounts, players) {
        let timeslotIsFree;
        const freeTimeslots = [];
        for (const timeslot of TIMESLOTS) {
            timeslotIsFree = true;
            for (const [player, count] of Object.entries(playerCounts[timeslot])) {
                if (players.includes(Number(player)) && Number(count) > 0) {
                    timeslotIsFree = false;
                    break;
                }
            }
            if (timeslotIsFree === false) continue;
            freeTimeslots.push(Number(timeslot));
        }
        return freeTimeslots;
    }
    
    function countPlaysPerTimeslotAndGame() {
        const counts = Object.fromEntries(
            TIMESLOTS.map(timeslot => [timeslot, {}])
        );
        for (const timeslot of TIMESLOTS) {
            const playsInTimeslot = findPlaysForTimeslot(timeslot);
            if (!Array.isArray(playsInTimeslot)) continue;
            for (const play of playsInTimeslot) {
                counts[timeslot][play.playedGame] = (counts[timeslot][play.playedGame] ?? 0) + 1;
            }
        }
        return counts;
    }
    
    function findFreeTimeslotsForGames(gameCounts, playedGame) {
        let timeslotIsFree;
        const freeTimeslots = [];
        for (const timeslot of TIMESLOTS) {
            timeslotIsFree = true;
            for (const [game, count] of Object.entries(gameCounts[timeslot])) {
                if (playedGame === Number(game) && Number(count) > 0) {
                    timeslotIsFree = false;
                    break;
                }
            }
            if (timeslotIsFree === false) continue;
            freeTimeslots.push(Number(timeslot));
        }
        return freeTimeslots;
    }
    
    function countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, playersOfPlay) {
        const conflictsPerTimeslot = {};
        for (const timeslot of TIMESLOTS) {
            for (const [player, count] of Object.entries(playCountsPerTimeslotAndPlayer[timeslot])) {
                if (playersOfPlay.includes(Number(player)) && Number(count) > 0) {
                    conflictsPerTimeslot[timeslot] = (conflictsPerTimeslot[timeslot] ?? 0) + 1;
                }
            }
        }
        return conflictsPerTimeslot;
    }
    
    function findLeastOccuppiedTimeslots(freeTimeslots) {
        const playerCounts = countPlayersPerTimeslot();
        const freeTimeslotsPlayerCount = Object.fromEntries(Object.entries(playerCounts).filter(([timeslot]) => freeTimeslots.includes(Number(timeslot))));
        const smallestCount = Math.min(...Object.values(freeTimeslotsPlayerCount));
    
        return Object.entries(freeTimeslotsPlayerCount)
            .filter(([, count]) => count === smallestCount)
            .map(([timeslot]) => Number(timeslot));
    }
    
    function countPlayersPerTimeslot() {
        const counts = Object.fromEntries(
            TIMESLOTS.map(timeslot => [timeslot, 0])
        );
    
        for (const play of plays) {
            if (!Array.isArray(play.timeslot)) continue;
    
            for (const timeslot of play.timeslot) {
                if (timeslot in counts) {
                    counts[timeslot] += play.players.length;
                };
            };
        };
    
        return counts;
    }
    
    function chooseTwoConsecutiveTimeslots(candidateSlots, playCountsPerTimeslotAndPlayer, players) {
        const firstSlot = findTwoConsecutiveTimeslots(candidateSlots, playCountsPerTimeslotAndPlayer, players);
    
        //Ein Spiel mit einer Länge von zwei Slots darf nicht über den letzten Timeslot hinausgehen.

        if (firstSlot === lastSlot) {
            return [lastSlot - 1, lastSlot];
        };
    
        return [firstSlot, firstSlot + 1];
    }
    
    function findTwoConsecutiveTimeslots(freeSlots, playCountsPerTimeslotAndPlayer, players) {
        for (const timeslot of freeSlots) {
            if (freeSlots.includes(timeslot + 1)) {
                return timeslot;
            };
        };
        const conflictsPerTimeslot = countConflictsPerTimeslot(playCountsPerTimeslotAndPlayer, players);
        let bestSecondTimeslot;
        let after = true;
        for (const timeslot of freeSlots) {
            if (!bestSecondTimeslot) {
                if (timeslot === lastSlot) {
                    bestSecondTimeslot = timeslot - 1;
                    after = false;
                } else {
                    bestSecondTimeslot = timeslot + 1;
                    after = true;
                }
            }
            if (timeslot !== lastSlot) {
                if (conflictsPerTimeslot[timeslot + 1] < conflictsPerTimeslot[bestSecondTimeslot]) {
                    bestSecondTimeslot = timeslot + 1;
                    after = true;
                }
            } else if (timeslot !== 1) {
                if (conflictsPerTimeslot[timeslot - 1] < conflictsPerTimeslot[bestSecondTimeslot]) {
                    bestSecondTimeslot = timeslot - 1;
                    after = false;
                }
            } 
        };
        if (after) {
            return bestSecondTimeslot - 1;
        };
        return bestSecondTimeslot + 1;
    }
    
    function findPlaysForTimeslot(timeslot) {
        return plays.filter(play =>
            play.timeslot?.includes(timeslot)
        );
    }
    
    function assessPlaysWithInvalidPlayCount() {
        const playsWithInvalidPlaycount = plays.filter(play => {
            const playedGame = games.find(game => game.id === play.playedGame);
            return play.isValidPlayerCount(playedGame) === false;
        });
        for (const timeslot of TIMESLOTS) {
            const playsOfTimeslot = playsWithInvalidPlaycount.filter(play => play.timeslot.includes(timeslot));
    
            if (playsOfTimeslot.length === 0) continue;
            for (const play of playsOfTimeslot) {
                const freePlayers = countFreePlayersPerTimeslot([timeslot])[timeslot] ?? [];
                if (freePlayers.length === 0) {
                    play.timeslot = [0];
                    continue;
                } else if (!assignFreePlayersToPlays(freePlayers, play)) play.timeslot = [0];
                       
            };
        };
    }
    
    function assignFreePlayersToPlays(freePlayers, play) {
        const shuffledPlayers = shuffle(freePlayers);
        const playCopy = play.clone();
        const game = games.find(game => game.id === play.playedGame)
        for (const [index, player] of shuffledPlayers.entries()) {
            playCopy.players.push(player);
            if (playCopy.isValidPlayerCount(game)) {
                play.players.push(...shuffledPlayers.slice(0, index + 1));
                play.validPlayerCount = play.isValidPlayerCount(game);
                return true;
            };
        };
        return false;
    }
    
    function countFreePlayersPerTimeslot(timeslots) {
        const playsPerTimeslotAndPlayer = countPlaysPerTimeslotAndPlayer();
        const freePlayersPerTimeslot = {};
        for (const timeslot of timeslots ?? TIMESLOTS) {
            for (const [player, count] of Object.entries(playsPerTimeslotAndPlayer[timeslot])) {
                if (count === 0) {
                    freePlayersPerTimeslot[timeslot] ??= [];
                    freePlayersPerTimeslot[timeslot].push(Number(player));
                };
            };
        };
        return freePlayersPerTimeslot;
    }
}
