import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

document.addEventListener('vaxflow-db-ready', () => {
    initStockModule();
});

function initStockModule() {
    const form = document.getElementById('stockForm');
    if (!form) return;

    const itemIdInput = document.getElementById('item_id');
    if (itemIdInput && !itemIdInput.value) {
        itemIdInput.value = 'STK-' + Date.now().toString().slice(-6);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        if (!payload.item_id) {
            payload.item_id = 'STK-' + Date.now().toString().slice(-6);
        }

        payload.uniqueKey = 'item_id';
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) { alert('Database not initialized.'); return; }

        try {
            db.exec({
                sql: `INSERT OR REPLACE INTO Stock (item_id, category, name, batch, expiry, opening, used, wasted, linked_accessory, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.item_id,
                    payload.category || 'Vaccines',
                    payload.name || '',
                    payload.batch || '',
                    payload.expiry || '',
                    payload.opening ? Number(payload.opening) : 0,
                    payload.used ? Number(payload.used) : 0,
                    payload.wasted ? Number(payload.wasted) : 0,
                    payload.linked_accessory || '',
                    'pending'
                ]
            });

            postToCloud('Stock', payload).then(() => {
                db.exec({ sql: 'UPDATE Stock SET sync_status = ? WHERE item_id = ?;', bind: ['synced', payload.item_id] });
            }).catch(err => console.warn('Cloud sync queued:', err));

            alert('Stock item saved successfully!');
            form.reset();
            if (itemIdInput) itemIdInput.value = 'STK-' + Date.now().toString().slice(-6);
            window.dispatchEvent(new CustomEvent('stock-updated', { detail: payload }));
        } catch (err) {
            console.error('Stock save failed:', err);
            alert('Failed to save stock: ' + err.message);
        }
    });
}
