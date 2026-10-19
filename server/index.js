const express = require("express");

const app = express();

app.use(express.static("public"));
app.use(express.json());



const PORT = 3000;

const db = require("./database");

const bcrypt = require("bcrypt");

const session = require("express-session");

const path = require("path");

let gameList = [];
let gameCardList = [];
let playersList = [];

app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: true,
}));

const PLAYER_COUNT = {

    INVALID: 1,

    OK: 2,

    PREFERRED: 3

};

class Game {

    constructor(id, title, playerCount, duration, explainingTime, tableCount, type) {

        this.id = id;
        this.title = title;
        this.playerCount = {
            min: playerCount.min,
            max: playerCount.max,
            preferred: playerCount.preferred,
            excluded: playerCount.excluded
        };
        this.duration = {
            min: duration.min,
            max: duration.max
        }
        this.explainingTime = explainingTime;
        this.tableCount = tableCount;
        this.type = type;
    }

}

class Player {

    constructor(id, firstName, lastName, availableTimeslots, data, gamePreferences) {

        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.timeslots = availableTimeslots;
        this.data = data;
        this.gamePreferences = gamePreferences;
        
    }
}

function adminData(req) {
    return req.session.admin;
}

function isAdmin(req) {
    return !!adminData(req);
}

function requireAdmin(req, res, next) {
    if (!isAdmin) {
        return res.redirect("/login/login.html");
    }
    next();
}

async function deleteData(del, dataId, tableName, primaryKeyColumn) {
    if (del) {
        await db.query(
            `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ?`,
            [dataId]
        );
        return {
            success: true,
            type: "gelöscht"
        };
    }
    return {success: false};
}

async function createDataEntry(dataId, tableName, firstKey, firstObject) {
    if (dataId === 0) {  
        const [result] = await db.query(
            `INSERT INTO ${tableName} (${firstKey}) VALUES (?)`,
            [firstObject]
            );
        let newDataId;
        if (tableName === "gameCards" || tableName === "timeslots" || tableName === "game_preferences") newDataId = firstObject; else newDataId = result.insertId;
        const message = " erfolgreich angelegt!";
        const returnResult = {
            dataId: newDataId,
            message: message,
            success: true,
        };
        return returnResult;
    }
    return {success: false};
}

async function writeData(data, dataColumns, tableName, dataId, primaryKeyColumn) {
    let action = "";
    const dataType = new Map([
        ["players", ["Der Teilnehmer", data.firstName]],
        ["games", ["Das Spiel", data.title]],
        ["gameCards", ["Die Kachel des Spiels", ""]]
    ]);

    console.log("Wir sind im Durchlauf", tableName);
    
    console.log(dataColumns[0], data[dataColumns[0]]);
    const newEntryResult = await createDataEntry(dataId, tableName, dataColumns[0], data[dataColumns[0]]);
    let newDataId;
    console.log("Das Result ist", newEntryResult);
    if (newEntryResult.success) {
        newDataId = newEntryResult.dataId;
        action = "erstellt";
    } else {
        newDataId = dataId;
        action = "bearbeitet";
    };

    console.log(`newDataID = ${newDataId}`, dataColumns);

    for (const column of dataColumns)  {
        await db.query(
            `UPDATE ${tableName} SET ${column} = ? WHERE ${primaryKeyColumn} = ?`,
            [data[column], newDataId]
        );
    };
    if (!dataType.get(tableName)) return {success: true};
    const message = `${dataType.get(tableName)[0]} ${dataType.get(tableName)[1]} wurde erfolgreich ${action}!`;
    return { message: message, success: true, title: dataType.get(tableName)[1], newDataId: newDataId };
}

app.use("/admin", requireAdmin);

let players = [];

app.get("/games", async (req, res) => {
    const [games_data] = await db.query(
        "SELECT * FROM games"
    );
    gameList.length = 0;
    for (const game_entry of games_data) {
        const game = new Game(
            game_entry.id,
            game_entry.title,
            {min: game_entry.minPlayers, max: game_entry.maxPlayers},
            {min: game_entry.minDuration, max: game_entry.maxDuration},
            game_entry.explainingTime,
            game_entry.tableCount,
            game_entry.type
        );
        gameList.push(game);
    }
    for (const game of gameList) {
        const [preferred_player_count] = await db.query(
            "SELECT * FROM game_preferred_player_count WHERE game_id = ?",
            [game.id]
        );
        game.playerCount.preferred = preferred_player_count.map(row => row.player_count);
        const [excluded_player_count] = await db.query(
            "SELECT * FROM game_excluded_player_count WHERE game_id = ?",
            [game.id]
        );
        game.playerCount.excluded = excluded_player_count.map(row => row.player_count);
    };
    res.json(gameList);
});

app.get("/gameCards", async (req, res) => {
    const [gameCards_data] = await db.query(
        "SELECT * FROM gameCards"
    );
    gameCardList.length = 0;
    for (const gameCard_entry of gameCards_data) {
        const gameCard = {
            id: gameCard_entry.id,
            gameCover: gameCard_entry.gameCover,
            primaryGameColor: gameCard_entry.primaryGameColor,
            secondaryGameColor: gameCard_entry.secondaryGameColor,
            highlightGameColor: gameCard_entry.highlightGameColor
        }
        gameCardList.push(gameCard);
    }
    res.json(gameCardList);
});

app.get("/emptyPlayer", async (req, res) => {
    const emptyPlayer = new Player(
        0,
        "",
        "",
        {
            slot_all: false,
            slot_1: false,
            slot_2: false,
            slot_3: false,
            slot_4: false,
            slot_5: false,
            slot_6: false,
            slot_7: false,
            slot_8: false
        },
        {
            email: "",
            mobile: "",
            overnightOptions: {
                stayOvernight: null,
                roomPreference: "",
                bedLinenNeeded: null,
            },
            modeOfTransportation: null,
            specialFoodNeeds: {
                vegetarian: false,
                otherFoodNeeds: false,
                foodNeedsText: ""
            },
            joinWhatsApp: null,
            agreeToJoin: false
        },
        {
            rank_1: 0,
            rank_2: 0,
            rank_3: 0,
            rank_4: 0,
            rank_5: 0,
            rank_6: 0,
            rank_7: 0,
            rank_8: 0,
            rank_excluded: []
        }
    )
    res.json(emptyPlayer);
});

app.get("/players", async (req, res) => {
    const data = {
        players: [],
        timeslots: [],
        game_preferences: [],
        game_preferences_excluded: []
    };

    for (const key in data) {
        [data[key]] = await db.query(
            `SELECT * FROM ${key}`
        );
    };
    for (const gamePreference of data.game_preferences) {
        const excludedGamesOfPlayer = data.game_preferences_excluded.filter(preference => preference.player_id === gamePreference.player_id);
        gamePreference.rank_excluded = excludedGamesOfPlayer.map(preference => preference.game_id);
    };

    playersList.length = 0;

    for (const player of data.players) {
        
        for (const data_entry in player) {
            if (data_entry === "id") continue;

            const value = player[data_entry];
            player[data_entry] =
                value === 1 ? true
                : value === 0 ? false
                : value;
        };
        
        let timeslotsOfPlayer = data.timeslots.find(timeslot => timeslot.player_id === player.id);
        if (timeslotsOfPlayer) {
            delete timeslotsOfPlayer.player_id;
            for (timeslot in timeslotsOfPlayer) {
                timeslotsOfPlayer[timeslot] = timeslotsOfPlayer[timeslot] === 1 ? true : false;
            }
        } else {
            timeslotsOfPlayer = {
                slot_all: false,
                slot_1: false,
                slot_2: false,
                slot_3: false,
                slot_4: false,
                slot_5: false,
                slot_6: false,
                slot_7: false,
                slot_8: false
            };
        };
        let gamePreferencesOfPlayer = data.game_preferences.find(gamePreference => gamePreference.player_id === player.id);
        if (gamePreferencesOfPlayer) {
            delete gamePreferencesOfPlayer.player_id;
        } else {
            gamePreferencesOfPlayer = {
                rank_1: 0,
                rank_2: 0,
                rank_3: 0,
                rank_4: 0,
                rank_5: 0,
                rank_6: 0,
                rank_7: 0,
                rank_8: 0
            };
        }

        const playerEntry = new Player(
            player.id,
            player.firstName,
            player.lastName,
            timeslotsOfPlayer,
            {
                email: player.email,
                mobile: player.mobile,
                overnightOptions: {
                    stayOvernight: player.stayOvernight,
                    roomPreference: player.roomPreference,
                    bedLinenNeeded: player.bedLinenNeeded,
                },
                modeOfTransportation: player.modeOfTransportation,
                specialFoodNeeds: {
                    vegetarian: player.vegetarian,
                    otherFoodNeeds: player.otherFoodNeeds,
                    foodNeedsText: player.foodNeedsText
                },
                joinWhatsApp: player.joinWhatsApp,
                agreeToJoin: player.agreeToJoin
            },
            gamePreferencesOfPlayer
        );
        playersList.push(playerEntry);
    }
    res.json(playersList);
    
});

app.get("/checkLogin", async (req, res) => {
    if (isAdmin(req)) {
        const admin = adminData(req);
        res.json({
            id: admin.id,
            username: admin.username,
            loggedIn: admin.loggedIn
        });
    } else {
        res.json({
            loggedIn: isAdmin(req)
        });
    };
});

app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    const [admins] = await db.query(
        "SELECT * FROM admins WHERE username = ?",
        [username]
    );
    if (admins.length === 0) {
        return res.status(401).send( "Ungültiger Benutzername oder Passwort" );
    }
    const admin = admins[0];
    const isMatch = await bcrypt.compare(
        password,
        admin.passwordHash
    );
    if (!isMatch) {
        return res.status(401).send( "Ungültiger Benutzername oder Passwort" );
    }
    req.session.admin = {
        id: admin.id,
        username: admin.username,
        loggedIn : true
    };

    const returnTo = req.session.returnTo || "/admin";
    delete req.session.returnTo;
    
    res.json({
        success: true,
        redirect: returnTo
    });


});

app.post("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({
                message: "Logout fehlgeschlagen.",
                success: false
            });
        };

        res.clearCookie("connect.sid");
        console.log("Kekse gereinigt.");
        res.json({
            message: "Logout erfolgreich!",
            success: true
        });
    });
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/admin/admin.html"));
});


app.get("/assess", (req, res) => {

    const result = terraformingMars1.assessPlayerCount(terraformingMars.playerCount);
    let message = "";

    if (result === 1) {
            message = "Die Spieleranzahl ist nicht geeignet für dieses Spiel.";
        }
        else if (result === 2) {
            message = "Die Spieleranzahl ist geeignet für dieses Spiel.";
        }
        else if (result === 3) {
            message = "Die Spieleranzahl ist perfekt für dieses Spiel.";
        }
    
    res.send(message);

});

app.post("/players", async (req, res) => {
    console.log(req.body);
    const { firstName, lastName, email, mobile, timeslots, stayOvernight, roomPreference, bedLinenNeeded, modeOfTransportation, vegetarian, otherFoodNeeds, foodNeedsText, joinWhatsApp, agreeToJoin, gamePreferences, playerId, del } = req.body;
    
    let thisPlayerId = req.body.playerId;

    if (thisPlayerId !== 0)  {
        await db.query(
            `DELETE FROM game_preferences_excluded WHERE game_id = ?`,
            [thisPlayerId]
        );
    };

    if (req.body.del) {
        const delResult = await deleteData(req.body.del, req.body.playerId, "players", "id");
        const delTimeslotsResult = await deleteData(req.body.del, req.body.playerId, "timeslots", "player_id");
        const delGamePreferencesResult = await deleteData(req.body.del, req.body.playerId, "game_preferences", "player_id");
        console.log(delResult);
        return res.json(delResult);
    };
    
    const playerColumns = Object.keys(req.body).filter(
        key => !["playerId", "del", "timeslots", "gamePreferences"].includes(key)
    );
    const timeslotColumns = ["player_id", ...Object.keys(timeslots)];
    const gamePreferenceColumns = ["player_id", ...Object.keys(gamePreferences).filter(key => !["rank_excluded"].includes(key))];

    for (const key in req.body) {
        if (typeof req.body[key] === "boolean" && key !== "del") {
            req.body[key] = req.body[key] ? 1 : 0;
            continue;
        };
        if (key === "timeslots") {
            for (const timeslot in req.body[key]) {
                if (typeof req.body[key][timeslot] === "boolean") {
                    console.log("Boolean gefunden:", key, timeslot);
                    req.body[key][timeslot] = req.body[key][timeslot] ? 1 : 0;
                }
            }
        }
    };

    const playerResult = await writeData(req.body, playerColumns, "players", req.body.playerId, "id");
    
    const timeslotResult = await writeData({player_id: playerResult.newDataId, ...req.body.timeslots}, timeslotColumns, "timeslots", req.body.playerId, "player_id");

    const gamePreferenceResult = await writeData({player_id: playerResult.newDataId, ...req.body.gamePreferences}, gamePreferenceColumns, "game_preferences", req.body.playerId, "player_id");

    thisPlayerId = playerResult.newDataId;
    const values = req.body.gamePreferences.rank_excluded.map(gameId => [
        thisPlayerId,
        gameId
    ]);
    if (values.length > 0) {
        db.query(
            "INSERT INTO game_preferences_excluded (player_id, game_id) VALUES ?",
            [values]
        );
    };

    res.json(playerResult);
});

app.post("/games", async (req, res) => {
    const { title, minPlayers, maxPlayers, preferredPlayers, excludedPlayers, minDuration, maxDuration, explainingTime, tableCount, type, gameId, del } = req.body;
    const gameColumns = Object.keys(req.body).filter(
        key => !["preferredPlayers", "excludedPlayers", "gameId", "del"].includes(key)
    );
    let thisGameId = req.body.gameId;
    if (thisGameId !== 0)  {
        const tables = ["game_preferred_player_count", "game_excluded_player_count"];
        for (const table of tables) {
            await db.query(
                `DELETE FROM ${table} WHERE game_id = ?`,
                [thisGameId]
            );
        };
    };

    if (req.body.del) {
        const delResult = await deleteData(req.body.del, req.body.gameId, "games", "id");
        return res.json(delResult);
    }

    const result = await writeData(req.body, gameColumns, "games", thisGameId, "id");
    console.log(result);
    thisGameId = result.newDataId;
    let values = req.body.preferredPlayers.map(playerCount => [
        thisGameId,
        playerCount
    ]);
    if (values.length > 0) {
        db.query(
            "INSERT INTO game_preferred_player_count (game_id, player_count) VALUES ?",
            [values]
        );
    };
    values = req.body.excludedPlayers.map(playerCount => [
        thisGameId,
        playerCount
    ]);
    if (values.length > 0) {
        db.query(
            "INSERT INTO game_excluded_player_count (game_id, player_count) VALUES ?",
            [values]
        );
    };
    res.json(result);
});

app.post("/gameCards", async (req, res) => {
    const { id, gameCover, primaryGameColor, secondaryGameColor, highlightGameColor, dataId, del  } = req.body;
    const gameColumns = Object.keys(req.body).filter(
        key => !["dataId", "del"].includes(key)
    );
    let thisGameId = req.body.dataId;

    const result = await writeData(req.body, gameColumns, "gameCards", thisGameId, "id");
    res.json(result);
});

app.get("/admin/spiele", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/games/games.html"));
});

app.get("/admin/teilnehmer", (req,res) => {
    res.sendFile(path.join(__dirname, "../public/player/player.html"));
});

app.get("/admin/spieleranking", (req,res) => {
    res.sendFile(path.join(__dirname, "../public/ranking/ranking.html"));
});

app.get("/admin/nerdsweekplanung", (req,res) => {
    res.sendFile(path.join(__dirname, "../public/createPlan/createPlan.html"));
});

app.get("/join", (req,res) => {
    res.sendFile(path.join(__dirname, "../public/join/join.html"));
});

app.listen(PORT, "0.0.0.0", (error) => {
    if (error) {
        console.error("Serverstart fehlgeschlagen:", error);
        process.exitCode = 1;
        return;
    }

    console.log(`Server läuft auf Port ${PORT}`);
});

//const bcrypt = require("bcrypt");

//const password = "";

//const hash = bcrypt.hashSync(password, 10);

//console.log(hash);