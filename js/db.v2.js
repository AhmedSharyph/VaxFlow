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
        initDB(dbInstance);
        return dbInstance;
    } catch (err) {
        console.error("SQLite initialization error:", err);
        const sqlite3 = await sqlite3InitModule();
        dbInstance = new sqlite3.oo1.DB(':memory:', 'ct');
        initDB(dbInstance);
        return dbInstance;
    }
}

export function initDB(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS Sessions (
            id TEXT PRIMARY KEY,
            facility TEXT,
            vaccinator TEXT,
            is_open INTEGER DEFAULT 1,
            session_date TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS Staff (
            id TEXT PRIMARY KEY,
            name TEXT,
            role TEXT,
            designation TEXT,
            contact TEXT,
            is_disabled INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS Stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT UNIQUE,
            category TEXT,
            name TEXT,
            batch TEXT,
            expiry TEXT,
            opening INTEGER,
            used INTEGER DEFAULT 0,
            wasted INTEGER DEFAULT 0,
            linked_accessory TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS Vaccinations (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            child_name TEXT,
            dob TEXT,
            contact TEXT,
            vaccine TEXT,
            batch TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS beneficiaries (
            beneficiary_id TEXT PRIMARY KEY,
            eir_id TEXT UNIQUE NOT NULL,
            foolhumaa_form_number TEXT,
            beneficiary_national_id TEXT,
            currently_living TEXT DEFAULT 'Sh. Funadhoo',
            beneficiary_name TEXT NOT NULL,
            dob TEXT NOT NULL,
            sex TEXT CHECK(sex IN ('Male', 'Female', 'Other')),
            country TEXT DEFAULT 'Maldives',
            atoll_island_residence TEXT,
            current_address TEXT,
            mother_name TEXT,
            mother_national_id TEXT,
            primary_contact TEXT,
            caregiver_name TEXT,
            caregiver_id TEXT,
            caregiver_contact TEXT,
            gestational_age_weeks INTEGER,
            birth_weight REAL,
            delivery_mode TEXT,
            number_delivered INTEGER DEFAULT 1,
            birth_facility TEXT,
            HepB_Within24h TEXT CHECK(HepB_Within24h IN ('Yes', 'No', 'Pending')),
            remarks TEXT,
            registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS ColdChain (
            equipment_id TEXT PRIMARY KEY,
            equipment_name TEXT,
            equipment_type TEXT,
            temperature REAL,
            status TEXT,
            last_checked TEXT,
            remarks TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
        CREATE TABLE IF NOT EXISTS Tally (
            tally_id TEXT PRIMARY KEY,
            tally_date TEXT,
            session_id TEXT,
            vaccine_code TEXT,
            dose_number TEXT,
            age_group TEXT,
            count INTEGER,
            facility TEXT,
            remarks TEXT,
            sync_status TEXT DEFAULT 'pending'
        );
    `);
}

export function getDB() {
    return dbInstance;
}
