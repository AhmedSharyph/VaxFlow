import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

document.addEventListener('vaxflow-db-ready', () => {
    initTallyModule();
});

function initTallyModule() {
    const form = document.getElementById('tallyForm');
    if (!form) return;

    const tallyIdInput = document.getElementById('tally_id');
    if (tallyIdInput && !tallyIdInput.value) {
        tallyIdInput.value = 'TAL-' + Date.now().toString().slice(-6);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        if (!payload.tally_id) {
            payload.tally_id = 'TAL-' + Date.now().toString().slice(-6);
        }

        payload.uniqueKey = 'tally_id';
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) { alert('Database not initialized.'); return; }

        try {
            db.exec({
                sql: `INSERT OR REPLACE INTO Tally (tally_id, tally_date, session_id, vaccine_code, dose_number, age_group, count, facility, remarks, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.tally_id,
                    payload.tally_date || new Date().toISOString().split('T')[0],
                    payload.session_id || '',
                    payload.vaccine_code || '',
                    payload.dose_number || '',
                    payload.age_group || '',
                    payload.count ? Number(payload.count) : 0,
                    payload.facility || 'Sh. Funadhoo Health Center',
                    payload.remarks || '',
                    'pending'
                ]
            });

            postToCloud('Tally', payload).then(() => {
                db.exec({ sql: 'UPDATE Tally SET sync_status = ? WHERE tally_id = ?;', bind: ['synced', payload.tally_id] });
            }).catch(err => console.warn('Cloud sync queued:', err));

            alert('Tally record saved successfully!');
            form.reset();
            if (tallyIdInput) tallyIdInput.value = 'TAL-' + Date.now().toString().slice(-6);
            window.dispatchEvent(new CustomEvent('tally-updated', { detail: payload }));
        } catch (err) {
            console.error('Tally save failed:', err);
            alert('Failed to save tally: ' + err.message);
        }
    });
}
