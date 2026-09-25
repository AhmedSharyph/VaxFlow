import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

let isStockEditing = false;
let editingStockId = null;

export function renderStock() {
    const db = getDB();
    if (!db) {
        setTimeout(renderStock, 200);
        return;
    }

    try {
        const rows = db.exec({ sql: 'SELECT * FROM Stock;', rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('stockTableBody');
        const totalEl = document.getElementById('statTotalStock');
        const badgeEl = document.getElementById('stockCountBadge');
        
        if (totalEl) totalEl.innerText = rows.length;
        if (badgeEl) badgeEl.innerText = `${rows.length} Items`;
        
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="py-6 px-6 text-center text-slate-400 italic">No inventory stock added. Click 'Add Stock Item' above.</td></tr>`;
            return;
        }

        rows.forEach(r => {
            const balance = r.opening - (r.used || 0) - (r.wasted || 0);
            let badgeColor = 'bg-slate-100 text-slate-700';
            if (r.category === 'Vaccines') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
            else if (r.category === 'Diluents') badgeColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
            else if (r.category === 'Droppers / Adapters') badgeColor = 'bg-sky-50 text-sky-700 border border-sky-200';

            const kitInfo = r.linked_accessory ? `<br><span class="text-[10px] text-blue-600 font-semibold">Kit Pair: ${r.linked_accessory}</span>` : '';

            tbody.innerHTML += `
                <tr class="hover:bg-blue-50/20 transition">
                    <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeColor}">${r.category}</span></td>
                    <td class="py-4 px-6 font-bold text-slate-900">${r.name} ${kitInfo}</td>
                    <td class="py-4 px-6 font-mono text-xs text-blue-600 font-medium">${r.batch}</td>
                    <td class="py-4 px-6 text-slate-600 text-xs">${r.expiry ? r.expiry.split('T')[0] : ''}</td>
                    <td class="py-4 px-6 text-center font-medium">${r.opening}</td>
                    <td class="py-4 px-6 text-center font-bold text-emerald-600">${r.used || 0}</td>
                    <td class="py-4 px-6 text-center font-bold text-rose-600">${r.wasted || 0}</td>
                    <td class="py-4 px-6 text-center font-extrabold text-slate-900">${balance}</td>
                    <td class="py-4 px-6 text-right space-x-3">
                        <button type="button" onclick="window.openStockModal(${r.id})" class="text-xs text-blue-600 hover:underline font-bold">Edit</button>
                        <button type="button" onclick="window.deleteStockItem(${r.id})" class="text-xs text-rose-600 hover:underline font-bold">Delete</button>
                    </td>
                </tr>
            `;
        });

        const gate = document.getElementById('loadingGate');
        if (gate) {
            gate.style.opacity = '0';
            gate.style.transition = 'opacity 0.3s ease';
            setTimeout(() => gate.remove(), 300);
        }
    } catch (err) {
        console.error("Error rendering stock:", err);
    }
}

window.openStockModal = function(stockId = null) {
    const form = document.getElementById('stockForm');
    if (form) form.reset();
    const db = getDB();

    const titleEl = document.getElementById('stockModalTitle');
    const modal = document.getElementById('stockModal');

    if (stockId !== null && stockId !== undefined) {
        isStockEditing = true;
        editingStockId = stockId;
        const stock = db.exec({ sql: 'SELECT * FROM Stock WHERE id = ?;', bind: [stockId], rowMode: 'object', returnValue: 'resultRows' })[0];
        if (!stock) return;

        if (titleEl) titleEl.innerText = "Edit Stock & Batch Item";
        if (document.getElementById('stockCategory')) document.getElementById('stockCategory').value = stock.category;
        if (document.getElementById('stockName')) document.getElementById('stockName').value = stock.name;
        if (document.getElementById('stockBatch')) document.getElementById('stockBatch').value = stock.batch;
        if (document.getElementById('stockExpiry')) document.getElementById('stockExpiry').value = stock.expiry ? stock.expiry.split('T')[0] : '';
        if (document.getElementById('stockOpening')) document.getElementById('stockOpening').value = stock.opening;
        if (document.getElementById('stockAccessory')) document.getElementById('stockAccessory').value = stock.linked_accessory || '';
    } else {
        isStockEditing = false;
        editingStockId = null;
        if (titleEl) titleEl.innerText = "Add Stock Item";
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeStockModal = function() {
    const modal = document.getElementById('stockModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

window.handleStockSubmit = async function(event) {
    event.preventDefault();
    const db = getDB();
    const category = document.getElementById('stockCategory').value;
    const name = document.getElementById('stockName').value;
    const batch = document.getElementById('stockBatch').value;
    const expiry = document.getElementById('stockExpiry').value;
    const opening = parseInt(document.getElementById('stockOpening').value);
    const accessory = document.getElementById('stockAccessory') ? document.getElementById('stockAccessory').value : '';

    if (isStockEditing && editingStockId !== null) {
        db.exec({
            sql: 'UPDATE Stock SET category = ?, name = ?, batch = ?, expiry = ?, opening = ?, linked_accessory = ? WHERE id = ?;',
            bind: [category, name, batch, expiry, opening, accessory, editingStockId]
        });
    } else {
        db.exec({
            sql: 'INSERT INTO Stock (category, name, batch, expiry, opening, used, wasted, linked_accessory) VALUES (?, ?, ?, ?, ?, 0, 0, ?);',
            bind: [category, name, batch, expiry, opening, accessory]
        });
    }

    const savedStock = isStockEditing
        ? db.exec({ sql: 'SELECT * FROM Stock WHERE id = ?;', bind: [editingStockId], rowMode: 'object', returnValue: 'resultRows' })[0]
        : db.exec({ sql: 'SELECT * FROM Stock ORDER BY id DESC LIMIT 1;', rowMode: 'object', returnValue: 'resultRows' })[0];

    window.closeStockModal();
    renderStock();
    postToCloud('Stock', { ...savedStock, uniqueKey: 'id' });
}

window.deleteStockItem = function(id) {
    const db = getDB();
    db.exec({ sql: 'DELETE FROM Stock WHERE id = ?;', bind: [id] });
    renderStock();
    postToCloud('deleteStock', { id, uniqueKey: 'id' });
}

// Listen for core engine database ready event
window.addEventListener('vaxflow-db-ready', () => {
    renderStock();
});

// Fallback initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderStock, 600);
});
