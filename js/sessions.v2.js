import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

document.addEventListener('vaxflow-db-ready', () => {
    initSessionsModule();
});

function initSessionsModule() {
    const form = document.getElementById('sessionForm');
    if (!form) return;

    const sessionIdInput = document.getElementById('session_id') || document.getElementById('id');
    if (sessionIdInput && !sessionIdInput.value) {
        sessionIdInput.value = 'SES-' + Date.now().toString().slice(-6);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        if (!payload.id && !payload.session_id) {
            payload.id = 'SES-' + Date.now().toString().slice(-6);
        } else if (payload.session_id && !payload.id) {
            payload.id = payload.session_id;
        }

        payload.uniqueKey = 'id';
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) { alert('Database not initialized.'); return; }

        try {
            db.exec({
                sql: `INSERT OR REPLACE INTO Sessions (id, facility, vaccinator, is_open, session_date, sync_status) VALUES (?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.id,
                    payload.facility || 'Sh. Funadhoo Health Center',
                    payload.vaccinator || '',
                    payload.is_open !== undefined ? Number(payload.is_open) : 1,
                    payload.session_date || new Date().toISOString().split('T')[0],
                    'pending'
                ]
            });

            postToCloud('Sessions', payload).then(() => {
                db.exec({ sql: 'UPDATE Sessions SET sync_status = ? WHERE id = ?;', bind: ['synced', payload.id] });
            }).catch(err => console.warn('Cloud sync queued:', err));

            alert('Session saved successfully!');
            form.reset();
            if (sessionIdInput) sessionIdInput.value = 'SES-' + Date.now().toString().slice(-6);
            window.dispatchEvent(new CustomEvent('session-updated', { detail: payload }));
        } catch (err) {
            console.error('Session save failed:', err);
            alert('Failed to save session: ' + err.message);
        }
    });
}
