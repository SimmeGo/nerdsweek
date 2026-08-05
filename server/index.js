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

    constructor(id, firstName, lastName, availableTimeSlots, data, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8) {

        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.availableTimeSlots = availableTimeSlots;
        this.data = data;
        this.rank1 = rank1;
        this.rank2 = rank2;
        this.rank3 = rank3;
        this.rank4 = rank4;
        this.rank5 = rank5;
        this.rank6 = rank6;
        this.rank7 = rank7;
        this.rank8 = rank8
        
    }
}

function requireAdmin(req, res, next) {
    if (!req.session.admin) {
        return res.redirect("/login/login.html");
    }
    next();
}

async function deleteData(del, dataId, tableName) {
    if (del) {
        await db.query(
            `DELETE FROM ${tableName} WHERE id = ?`,
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
        console.log(dataId);    
        const [result] = await db.query(
            `INSERT INTO ${tableName} (${firstKey}) VALUES (?)`,
            [firstObject]
            );
        console.log(result.insertId);
        const newDataId = result.insertId;
        console.log(newDataId);
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

async function writeData(data, dataColumns, tableName, dataId) {
    let rows;
    let table;
    let tableGender;
    if (tableName === "games") {
        table = "Spiel";
        tableGender = "Das"
    } else if (tableName === "players") {
        table = "Spieler";
        tableGender = "Der";
    };
    const newEntryResult = await createDataEntry(dataId, tableName, dataColumns[0], data[dataColumns[0]]);
    let newDataId;
    if (newEntryResult.success === true) {
        newDataId = newEntryResult.dataId;
    } else {
        newDataId = dataId;
    };
    [rows] = await db.query(
            `SELECT * FROM ${tableName} WHERE id = ?`,
            [newDataId]
    );
    const dataEntry = rows[0];
    const delResult = await deleteData(data.del, dataId, tableName);
    if (delResult.success) {
        return {message: `${tableGender} ${table} ${Object.values(dataEntry)[1]} wurde erfolgreich gelöscht!`, success: delResult.success, del: true};
    }
    console.log(`newDataID = ${newDataId}`);
    for (const column of dataColumns)  {
        await db.query(
            `UPDATE ${tableName} SET ${column} = ? WHERE id = ?`,
            [data[column], newDataId]
        );
    };
    if (!newEntryResult.type) {
        newEntryResult.type = "bearbeitet";
    }
    const message = `${tableGender} ${table} ${Object.values(dataEntry)[1]} wurde erfolgreich ${newEntryResult.type}!`;
    return { message: message, success: newEntryResult.success, newDataId: newDataId };
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

app.get("/players", async (req, res) => {
    const [players_data] = await db.query(
        "SELECT * FROM players"
    );
    playersList.length = 0;
    for (const player_entry of players_data) {
        const player = new Player(
            player_entry.id,
            player_entry.firstName,
            player_entry.lastName,
            [],
            [],
            player_entry.rank1,
            player_entry.rank2,
            player_entry.rank3,
            player_entry.rank4,
            player_entry.rank5,
            player_entry.rank6,
            player_entry.rank7,
            player_entry.rank8
        );
        playersList.push(player);
    }
    console.log(playersList[7]);
    res.json(playersList);
    
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
        username: admin.username
    };
    const returnTo = req.session.returnTo || "/admin";
    delete req.session.returnTo;
    
    res.json({
        success: true,
        redirect: returnTo
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
    const { firstName, lastName, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8, playerId, del } = req.body;
    const playerColumns = Object.keys(req.body).filter(
        key => !["playerId", "del"].includes(key)
    );
    const result = await writeData(req.body, playerColumns, "players", req.body.playerId);
    res.json(result);
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
    const result = await writeData(req.body, gameColumns, "games", thisGameId);
    console.log(result);
    if (result.del) {
        return res.json(result);
    }
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

app.listen(PORT, () => {

    console.log(`Server läuft auf Port ${PORT}`);

});

//const bcrypt = require("bcrypt");

//const password = "";

//const hash = bcrypt.hashSync(password, 10);

//console.log(hash);