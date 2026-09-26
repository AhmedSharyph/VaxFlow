import { getDB } from './db.v2.1.js';
import { postToCloud } from './cloud.v2.1.js';

document.addEventListener('vaxflow-db-ready', () => {
    initColdChainModule();
});

function initColdChainModule() {
    const form = document.getElementById('coldChainForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        if (!payload.equipment_id) {
            payload.equipment_id = 'CC-' + Date.now().toString().slice(-6);
        }

        payload.uniqueKey = 'equipment_id';
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) { alert('Database not initialized.'); return; }

        try {
            db.exec({
                sql: `INSERT OR REPLACE INTO ColdChain (equipment_id, equipment_name, equipment_type, temperature, status, last_checked, remarks, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.equipment_id,
                    payload.equipment_name || '',
                    payload.equipment_type || 'Refrigerator',
                    payload.temperature !== undefined && payload.temperature !== '' ? Number(payload.temperature) : null,
                    payload.status || 'Optimal',
                    payload.last_checked || new Date().toISOString(),
                    payload.remarks || '',
                    'pending'
                ]
            });

            postToCloud('ColdChain', payload).then(() => {
                db.exec({ sql: 'UPDATE ColdChain SET sync_status = ? WHERE equipment_id = ?;', bind: ['synced', payload.equipment_id] });
            }).catch(err => console.warn('Cloud sync queued:', err));

            alert('Cold chain log saved successfully!');
            form.reset();
            window.dispatchEvent(new CustomEvent('coldchain-updated', { detail: payload }));
        } catch (err) {
            console.error('Cold chain save failed:', err);
            alert('Failed to save cold chain log: ' + err.message);
        }
    });
}
