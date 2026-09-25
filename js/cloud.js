const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyS6tuh8lc9Zh3tsLFSFOzxtUiwvGDI83Ki07Ous-5aK5b2HL6EZBT5A8p5A92D83k2/exec';

export async function syncFromCloud(db) {
    if (!APPS_SCRIPT_URL.startsWith('http')) return;
    try {
        const res = await fetch(APPS_SCRIPT_URL + '?action=fetchAll');
        const data = await res.json();
        
        if (data.tables) {
            if (data.tables.Sessions) {
                data.tables.Sessions.forEach(s => {
                    db.exec({
                        sql: 'INSERT OR REPLACE INTO Sessions (id, facility, vaccinator, is_open) VALUES (?, ?, ?, ?);',
                        bind: [s.id, s.facility, s.vaccinator, s.is_open !== undefined ? Number(s.is_open) : 1]
                    });
                });
            }
            if (data.tables.Staff) {
                data.tables.Staff.forEach(st => {
                    db.exec({
                        sql: 'INSERT OR REPLACE INTO Staff (id, name, role, designation, is_disabled) VALUES (?, ?, ?, ?, ?);',
                        bind: [st.id, st.name, st.role, st.designation, st.is_disabled !== undefined ? Number(st.is_disabled) : 0]
                    });
                });
            }
            if (data.tables.Stock) {
                data.tables.Stock.forEach(stk => {
                    db.exec({
                        sql: 'INSERT OR REPLACE INTO Stock (id, category, name, batch, expiry, opening, used, wasted) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
                        bind: [stk.id, stk.category || 'Vaccines', stk.name, stk.batch, stk.expiry, stk.opening, stk.used || 0, stk.wasted || 0]
                    });
                });
            }
        }
    } catch (err) {
        console.error("Cloud sync load failed", err);
    }
}

export async function postToCloud(tableName, payload) {
    if (!APPS_SCRIPT_URL.startsWith('http')) return;
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ tableName, payload, actor: 'Ahmed Shareef' })
        });
    } catch (err) {
        console.error("Background push failed", err);
    }
}