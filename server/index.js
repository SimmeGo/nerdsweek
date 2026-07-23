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

    constructor(id, firstName, lastName, availableTimeSlots, data, rating) {

        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.availableTimeSlots = availableTimeSlots;
        this.data = data;
        this.rating = rating;
    }
}

class timeSlot {

    constructor(id, date, startTime, playCount) {

        this.id = id;
        this.date = date;
        this.startTime = startTime;
        this.playCount = playCount;

    }
    assignGame(game) {}

}

class Play {

    constructor(id, timeSlot, players, duration) {

        this.id = id;
        this.timeSlot = timeSlot;
        this.players = players;
        this.duration = duration;
    }

    calculateScore() {}

    assessPlayerCount(playerCount) {
        
        if (this.players.length >= playerCount.min && this.players.length <= playerCount.max) {
            if (playerCount.preferred && playerCount.preferred.includes(this.players.length)) {
                return PLAYER_COUNT.PREFERRED;
            }
            else if (playerCount.excluded && playerCount.excluded.includes(this.players.length)) {
                return PLAYER_COUNT.INVALID;
            }
            else {
                return PLAYER_COUNT.OK;
            }
        }
        else {
            return PLAYER_COUNT.INVALID;
        }
    }
}

function requireAdmin(req, res, next) {
    if (!req.session.admin) {
        return res.redirect("/login/login.html");
    }
    next();
}

app.use("/admin", requireAdmin);

let players = [];

const terraformingMars1 = new Play(1, 1, ["Paula", "Simon", "Lukas"], 180)

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
    console.log(gameList[0]);
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
    console.log(gameList[0]);
    res.json(gameList);
    
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

app.post("/players", (req, res) => {
    console.log(req.body);
    const { firstName, lastName, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8 } = req.body;
    db.query(
        "INSERT INTO players (firstName, lastName, rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [req.body.firstName, req.body.lastName, req.body.rank1, req.body.rank2, req.body.rank3, req.body.rank4, req.body.rank5, req.body.rank6, req.body.rank7, req.body.rank8]
    );
    res.json({ message: "Spieler gespeichert" });
});

app.post("/games", async (req, res) => {
    console.log(req.body);
    const { title, minPlayers, maxPlayers, preferredPlayers, excludedPlayers, minDuration, maxDuration, explainingTime, tableCount, type } = req.body;
    const [result] = await db.query(
        "INSERT INTO games (title, minPlayers, maxPlayers, minDuration, maxDuration, explainingTime, tableCount, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [req.body.title, req.body.minPlayers, req.body.maxPlayers, req.body.minDuration, req.body.maxDuration, req.body.explainingTime, req.body.tableCount, req.body.type]
    );
    console.log(result.insertId);
    let values = req.body.preferredPlayers.map(playerCount => [
        result.insertId,
        playerCount
    ]);
    if (values.length > 0) {
        db.query(
            "INSERT INTO game_preferred_player_count (game_id, player_count) VALUES ?",
            [values]
        );
    };
    values = req.body.excludedPlayers.map(playerCount => [
        result.insertId,
        playerCount
    ]);
    if (values.length > 0) {
        db.query(
            "INSERT INTO game_excluded_player_count (game_id, player_count) VALUES ?",
            [values]
        );
    };
    res.json({ 
        message: "Spiel gespeichert",
        success: true
    });
});

app.get("/admin/spiele", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/games/games.html"));
});

app.listen(PORT, () => {

    console.log(`Server läuft auf Port ${PORT}`);

});

//const bcrypt = require("bcrypt");

//const password = "";

//const hash = bcrypt.hashSync(password, 10);

//console.log(hash);