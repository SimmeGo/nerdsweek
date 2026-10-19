const db = require("../server/database");

async function createTables() {
    try {
        await db.execute(`
            CREATE TABLE game_preferences_excluded (
                player_id INT,
                game_id INT
            )
    
        `);
        
        console.log("Tabelle erstellt");
    } finally {
        await db.end();
    }

}

createTables();