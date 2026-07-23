const db = require("./server/database");

async function createTables() {
    await db.execute(`
        CREATE TABLE game_excluded_player_count (
            game_id INT,
            player_count INT
        )

    `);

}

createTables();