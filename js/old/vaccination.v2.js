import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

let activeSessionId = null;

export function renderVaccinations() {
    const db = getDB();
    if (!db) {
        setTimeout(renderVaccinations, 200);
        return;
    }

    try {
        activeSessionId = sessionStorage.getItem('active_vax_session');
        if (!activeSessionId) {
            const openSessions = db.exec({ sql: 'SELECT id FROM Sessions WHERE is_open = 1 ORDER BY rowid DESC LIMIT 1;', rowMode: 'object', returnValue: 'resultRows' });
            if (openSessions.length > 0) {
                activeSessionId = openSessions[0].id;
                sessionStorage.setItem('active_vax_session', activeSessionId);
            } else {
                activeSessionId = 'SHAH-2026-09-26_01';
            }
        }

        const sessionRes = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' });
        if (sessionRes && sessionRes.length > 0) {
            const session = sessionRes[0];
            const headerIdEl = document.getElementById('headerSessionId');
            const headerFacEl = document.getElementById('headerFacility');
            if (headerIdEl) headerIdEl.innerText = session.id;
            if (headerFacEl) headerFacEl.innerText = `${session.facility} • Lead: ${session.vaccinator}`;
        }

        const rows = db.exec({ sql: 'SELECT * FROM Vaccinations WHERE session_id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('childTableBody');
        const badge = document.getElementById('childCountBadge');
        if (badge) badge.innerText = `${rows.length} Children`;

        if (tbody) {
            tbody.innerHTML = '';
            if (rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-6 px-6 text-center text-slate-400 italic">No children vaccinated in this session yet. Click 'Register Child &amp; Vaccinate' above.</td></tr>`;
            } else {
                rows.forEach(r => {
                    tbody.innerHTML += `
                        <tr class="hover:bg-blue-50/20 transition">
                            <td class="py-4 px-6 font-bold text-slate-900">${r.child_name}<br><span class="text-xs font-mono text-blue-600">ID: ${r.id}</span></td>
                            <td class="py-4 px-6 text-slate-600 text-xs">${r.dob}</td>
                            <td class="py-4 px-6 text-slate-600 text-xs">${r.contact}</td>
                            <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">${r.vaccine}</span></td>
                            <td class="py-4 px-6 font-mono text-xs text-slate-600">${r.batch}</td>
                            <td class="py-4 px-6 text-right">
                                <button type="button" onclick="window.deleteVaccinationRecord('${r.id}', '${r.batch}')" class="text-xs text-rose-600 hover:underline font-bold cursor-pointer">Remove</button>
                            </td>
                        </tr>
                    `;
                });
            }
        }

        removeLoadingGate();
    } catch (err) {
        console.error("Error rendering vaccinations:", err);
        removeLoadingGate();
    }
}

function removeLoadingGate() {
    const gate = document.getElementById('loadingGate');
    if (gate) {
        gate.style.opacity = '0';
        gate.style.transition = 'opacity 0.3s ease';
        setTimeout(() => gate.remove(), 300);
    }
}

window.openChildModal = function() {
    const form = document.getElementById('childForm');
    if (form) form.reset();
    const modal = document.getElementById('childModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeChildModal = function() {
    const modal = document.getElementById('childModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

window.handleChildSubmit = async function(event) {
    event.preventDefault();
    const db = getDB();
    if (!db) return;

    const name = document.getElementById('childName').value;
    const dob = document.getElementById('childDob').value;
    const contact = document.getElementById('childContact').value;
    const vaccine = document.getElementById('childVaccine').value;
    const batch = document.getElementById('childBatch').value.trim();

    // 1. STOCK VALIDATION: Check if batch exists in Stock and has remaining balance
    const stockRows = db.exec({ sql: 'SELECT * FROM Stock WHERE batch = ?;', bind: [batch], rowMode: 'object', returnValue: 'resultRows' });
    
    if (stockRows.length === 0) {
        alert(`Stock Validation Error: Batch number "${batch}" does not exist in your inventory stock records. Please add or check the stock batch first.`);
        return;
    }

    const stockItem = stockRows[0];
    const currentBalance = stockItem.opening - (stockItem.used || 0) - (stockItem.wasted || 0);

    if (currentBalance <= 0) {
        alert(`Stock Depleted: Batch "${batch}" (${stockItem.name}) has zero balance remaining (Opening: ${stockItem.opening}, Used: ${stockItem.used || 0}, Wasted: ${stockItem.wasted || 0}). Cannot vaccinate.`);
        return;
    }

    // 2. PROCEED WITH VACCINATION & STOCK DEDUCTION
    const childId = "CHD-" + Math.floor(1000 + Math.random() * 9000);

    db.exec({
        sql: 'INSERT INTO Vaccinations (id, session_id, child_name, dob, contact, vaccine, batch) VALUES (?, ?, ?, ?, ?, ?, ?);',
        bind: [childId, activeSessionId, name, dob, contact, vaccine, batch]
    });

    // Automatically increment 'used' count for this batch in Stock
    db.exec({
        sql: 'UPDATE Stock SET used = COALESCE(used, 0) + 1 WHERE batch = ?;',
        bind: [batch]
    });

    window.closeChildModal();
    renderVaccinations();

    // Sync vaccination and updated stock to cloud
    await postToCloud('Vaccinations', { id: childId, session_id: activeSessionId, child_name: name, dob, contact, vaccine, batch, uniqueKey: 'id' });
    await postToCloud('Stock', { ...stockItem, used: (stockItem.used || 0) + 1, uniqueKey: 'id' });
}

window.deleteVaccinationRecord = function(id, batch) {
    const db = getDB();
    if (!db) return;

    // Delete vaccination record
    db.exec({ sql: 'DELETE FROM Vaccinations WHERE id = ?;', bind: [id] });

    // Refund 1 unit back to the stock batch used count
    if (batch) {
        db.exec({
            sql: 'UPDATE Stock SET used = MAX(0, COALESCE(used, 0) - 1) WHERE batch = ?;',
            bind: [batch]
        });
        const updatedStock = db.exec({ sql: 'SELECT * FROM Stock WHERE batch = ?;', bind: [batch], rowMode: 'object', returnValue: 'resultRows' })[0];
        if (updatedStock) {
            postToCloud('Stock', { ...updatedStock, uniqueKey: 'id' });
        }
    }

    renderVaccinations();
    postToCloud('deleteVaccination', { id, uniqueKey: 'id' });
}

window.addEventListener('vaxflow-db-ready', () => {
    renderVaccinations();
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderVaccinations, 500);
    setTimeout(removeLoadingGate, 1200);
});
