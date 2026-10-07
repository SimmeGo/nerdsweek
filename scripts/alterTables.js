const db = require("../server/database");

async function alterTables() {
    try {
        await db.execute(`
            ALTER TABLE timeslots
                ADD COLUMN player_id INT,
                ADD COLUMN slot_all BOOLEAN,
                ADD COLUMN slot_1 BOOLEAN,
                ADD COLUMN slot_2 BOOLEAN,
                ADD COLUMN slot_3 BOOLEAN,
                ADD COLUMN slot_4 BOOLEAN,
                ADD COLUMN slot_5 BOOLEAN,
                ADD COLUMN slot_6 BOOLEAN,
                ADD COLUMN slot_7 BOOLEAN,
                ADD COLUMN slot_8 BOOLEAN
        `);
        
        console.log("Spalten hinzugefügt");
    } finally {
        await db.end();
    }
    

}

alterTables();