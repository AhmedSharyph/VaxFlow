import { getDB } from './db.v2.1.js';
import { postToCloud } from './cloud.v2.1.js';

document.addEventListener('vaxflow-db-ready', () => {
    initStaffModule();
});

function initStaffModule() {
    const form = document.getElementById('staffForm');
    if (!form) return;

    const staffIdInput = document.getElementById('staff_id');
    if (staffIdInput && !staffIdInput.value) {
        staffIdInput.value = 'STF-' + Date.now().toString().slice(-6);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        if (!payload.id && !payload.staff_id) {
            payload.id = 'STF-' + Date.now().toString().slice(-6);
        } else if (payload.staff_id && !payload.id) {
            payload.id = payload.staff_id;
        }
        
        payload.uniqueKey = 'id';
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) { alert('Database not initialized.'); return; }

        try {
            db.exec({
                sql: `INSERT OR REPLACE INTO Staff (id, name, role, designation, contact, is_disabled, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.id,
                    payload.name || '',
                    payload.role || '',
                    payload.designation || '',
                    payload.contact || '',
                    payload.is_disabled ? Number(payload.is_disabled) : 0,
                    'pending'
                ]
            });

            postToCloud('Staff', payload).then(() => {
                db.exec({ sql: 'UPDATE Staff SET sync_status = ? WHERE id = ?;', bind: ['synced', payload.id] });
            }).catch(err => console.warn('Cloud sync queued:', err));

            alert('Staff member saved successfully!');
            form.reset();
            if (staffIdInput) staffIdInput.value = 'STF-' + Date.now().toString().slice(-6);
            window.dispatchEvent(new CustomEvent('staff-updated', { detail: payload }));
        } catch (err) {
            console.error('Staff save failed:', err);
            alert('Failed to save staff: ' + err.message);
        }
    });
}
