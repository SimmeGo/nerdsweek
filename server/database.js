require("dotenv").config();

const mysql = require("mysql2/promise");

const db = mysql.createPool({
            host: "localhost",
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
console.log("Datenbank-Pool erstellt");

module.exports = db;