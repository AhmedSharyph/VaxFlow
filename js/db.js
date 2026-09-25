import sqlite3InitModule from 'https://esm.sh/@sqlite.org/sqlite-wasm';

let db = null;

export async function initDatabase(onProgress) {
    if (db) return db;
    
    if (onProgress) onProgress('Loading SQLite WASM module...');
    const sqlite3 = await sqlite3InitModule();

    if (onProgress) onProgress('Initializing local database engine...');
    db = new sqlite3.oo1.DB(':memory:', 'c');

    if (onProgress) onProgress('Creating workstation schemas...');
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
            designation TEXT,
            is_disabled INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS Stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            name TEXT,
            batch TEXT,
            expiry TEXT,
            opening INTEGER,
            used INTEGER DEFAULT 0,
            wasted INTEGER DEFAULT 0
        );
    `);
    
    if (onProgress) onProgress('Database ready.');
    return db;
}

export function getDB() {
    return db;
}