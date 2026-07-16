const mysql = require("mysql2/promise");

const connection = mysql.createConnection({

    host: "localhost",

    user: "root",

    password: "gudQap-canzaw-gyqmo8",

    database: "nerdsweek"

});

connection.connect((err) => {

    if (err) {

        console.error("Datenbankfehler:", err);

        return;

    }

    console.log("Mit Datenbank verbunden");

});

module.exports = connection;