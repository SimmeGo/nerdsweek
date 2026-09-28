const db = require("../server/database");

async function createTables() {
    await db.execute(`
        CREATE TABLE game_cards (
            game_id INT,
            gameCover VARCHAR(255),
            primaryGameColor VARCHAR(7),
            secondaryGameColor VARCHAR(7),
            highlightGameColor VARCHAR(7)
        )

    `);

}

createTables();