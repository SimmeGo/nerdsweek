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
        this.availableTimeslots = availableTimeslots;
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
            type: "erstellt"
        };
        return returnResult;
    }
    return {success: false};
}

async function writeData(data, dataColumns, tableName, dataId, primaryKeyColumn) {
    let rows;
    let table;
    let tableGender;
    console.log("Wir sind im Durchlauf", tableName);
    if (tableName === "games" || tableName === "gameCards") {
        table = "Spiel";
        tableGender = "Das"
    } else if (tableName === "players") {
        table = "Spieler";
        tableGender = "Der";
    };
    console.log(dataColumns[0], data[dataColumns[0]]);
    const newEntryResult = await createDataEntry(dataId, tableName, dataColumns[0], data[dataColumns[0]]);
    let newDataId;
    console.log("Das Result ist", newEntryResult);
    if (newEntryResult.success === true) {
        newDataId = newEntryResult.dataId;
    } else {
        newDataId = dataId;
    };
    [rows] = await db.query(
            `SELECT * FROM ${tableName} WHERE ${primaryKeyColumn} = ?`,
            [newDataId]
    );
    const dataEntry = rows[0];
    //const delResult = await deleteData(data.del, dataId, tableName);
    //if (delResult.success) {
    //    return {message: `${tableGender} ${table} ${Object.values(dataEntry)[1]} wurde erfolgreich gelöscht!`, success: delResult.success, del: true};
    //}
    console.log(`newDataID = ${newDataId}`);
    for (const column of dataColumns)  {
        await db.query(
            `UPDATE ${tableName} SET ${column} = ? WHERE ${primaryKeyColumn} = ?`,
            [data[column], newDataId]
        );
    };
    if (!newEntryResult.type) {
        newEntryResult.type = "bearbeitet";
    }
    let object;
    if (tableName === "gameCards") object = ""; else object = Object.values(dataEntry)[1];
    const message = `${tableGender} ${table} ${object} wurde erfolgreich ${newEntryResult.type}!`;
    return { message: message, success: newEntryResult.success, title: Object.values(dataEntry)[1], newDataId: newDataId };
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

app.get("/players", async (req, res) => {
    const [players_data] = await db.query(
        "SELECT * FROM players"
    );

    const [timeslots_data] = await db.query(
        "SELECT * FROM timeslots"
    );

    const [game_preferences_data] = await db.query(
        "SELECT * FROM game_preferences"
    );

    playersList.length = 0;
    for (const player_entry of players_data) {
        let timeslotsOfPlayer = timeslots_data.find(timeslot => timeslot.player_id === player_entry.id);
        if (timeslotsOfPlayer) {
            delete timeslotsOfPlayer.player_id;
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
        }
        let gamePreferencesOfPlayer = game_preferences_data.find(gamePreference => gamePreference.player_id === player_entry.id);
        if (gamePreferencesOfPlayer) {
            delete gamePreferencesOfPlayer.player_id;
        } else {
            gamePreferencesOfPlayer = {
                rank1: null,
                rank2: null,
                rank3: null,
                rank4: null,
                rank5: null,
                rank6: null,
                rank7: null,
                rank8: null
            };
        }

        const player = new Player(
            player_entry.id,
            player_entry.firstName,
            player_entry.lastName,
            timeslotsOfPlayer,
            {
                email: player_entry.email,
                mobile: player_entry.mobile,
                overnightOptions: {
                    stayOvernight: player_entry.stayOvernight,
                    roomPreference: player_entry.roomPreference,
                    bedLinenNeeded: player_entry.bedLinenNeeded,
                },
                modeOfTransportation: player_entry.modeOfTransportation,
                specialFoodNeeds: {
                    vegetarian: player_entry.vegetarian,
                    otherFoodNeeds: player_entry.otherFoodNeeds,
                    foodNeedsText: player_entry.foodNeedsText
                },
                joinWhatsApp: player_entry.joinWhatsApp,
                agreeToJoin: player_entry.agreeToJoin
            },
            gamePreferencesOfPlayer
        );
        playersList.push(player);
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
        console.log("Destroy-Funktion!");

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
    const { firstName, lastName, email, mobile, timeslots, stayOvernight, roomPreference, bedLinenNeeded,modeOfTransportation, vegetarian, otherFoodNeeds, foodNeedsText, joinWhatsApp, agreeToJoin, gamePreferences, playerId, del } = req.body;
    const playerColumns = Object.keys(req.body).filter(
        key => !["playerId", "del", "timeslots", "gamePreferences"].includes(key)
    );
    for (const key in req.body) {
        if (typeof req.body[key] === "boolean" && key !== "del") {
            console.log("Boolean gefunden:", key);
            req.body[key] = req.body[key] ? 1 : 0;
        }
    };
    if (req.body.del) {
        const delResult = await deleteData(req.body.del, req.body.playerId, "players", "id");
        const delTimeslotsResult = await deleteData(req.body.del, req.body.playerId, "timeslots", "player_id");
        const delGamePreferencesResult = await deleteData(req.body.del, req.body.playerId, "game_preferences", "player_id");
        res.json(delResult, delTimeslotsResult, delGamePreferencesResult);
    };

    const playerResult = await writeData(req.body, playerColumns, "players", req.body.playerId, "id");
    

    const timeslotColumns = ["player_id", ...Object.keys(timeslots).map(key => `slot_${key}`)];
    req.body.player_id = playerResult.newDataId;
    const timeslotResult = await writeData(req.body, timeslotColumns, "timeslots", req.body.playerId, "player_id");

    const gamePreferenceColumns = ["player_id", ...Object.keys(gamePreferences).map(key => `rank_${key}`)];
    const gamePreferenceResult = await writeData(req.body, gamePreferenceColumns, "game_preferences", req.body.playerId, "player_id");

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
    console.log(result);
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

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server läuft auf Port 3000");
});

//const bcrypt = require("bcrypt");

//const password = "";

//const hash = bcrypt.hashSync(password, 10);

//console.log(hash);