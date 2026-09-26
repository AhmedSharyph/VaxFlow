// db.v2.js snippet for table initialization
export function initDB(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Sessions (
            id TEXT PRIMARY KEY,
            facility TEXT,
            vaccinator TEXT,
            is_open INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS Staff (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            contact TEXT
        );
        CREATE TABLE IF NOT EXISTS Stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            name TEXT,
            batch TEXT,
            expiry TEXT,
            opening INTEGER,
            used INTEGER DEFAULT 0,
            wasted INTEGER DEFAULT 0,
            linked_accessory TEXT
        );
        CREATE TABLE IF NOT EXISTS Vaccinations (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            child_name TEXT,
            dob TEXT,
            contact TEXT,
            vaccine TEXT,
            batch TEXT
        );
    `);
}
