import sqlite3InitModule from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.45.1-build1/+esm';

let dbInstance = null;

export async function initDatabase() {
    if (dbInstance) return dbInstance;
    try {
        const sqlite3 = await sqlite3InitModule();
        if ('opfs' in sqlite3) {
            dbInstance = new sqlite3.oo1.OpfsDb('vaxflow_v2.sqlite3');
        } else {
            dbInstance = new sqlite3.oo1.DB('vaxflow_v2.sqlite3', 'ct');
        }
        
        // Execute table creation schema
        initDB(dbInstance);
        return dbInstance;
    } catch (err) {
        console.error("SQLite initialization error:", err);
        // Fallback to in-memory database if OPFS is restricted
        const sqlite3 = await sqlite3InitModule();
        dbInstance = new sqlite3.oo1.DB(':memory:', 'ct');
        initDB(dbInstance);
        return dbInstance;
    }
}

// Alias support for both naming conventions
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

export function getDB() {
    return dbInstance;
}
