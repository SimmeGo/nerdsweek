const db = require("../server/database");

async function createTables() {
    try {
        await db.execute(`
            CREATE TABLE game_preferences (
                player_id INT,
                rank_1 INT,
                rank_2 INT,
                rank_3 INT,
                rank_4 INT,
                rank_5 INT,
                rank_6 INT,
                rank_7 INT,
                rank_8 INT
            )
    
        `);
        
        console.log("Tabelle erstellt");
    } finally {
        await db.end();
    }

}

createTables();