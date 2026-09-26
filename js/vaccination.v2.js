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
            // Fallback to latest open session if storage is empty
            const openSessions = db.exec({ sql: 'SELECT id FROM Sessions WHERE is_open = 1 ORDER BY rowid DESC LIMIT 1;', rowMode: 'object', returnValue: 'resultRows' });
            if (openSessions.length > 0) {
                activeSessionId = openSessions[0].id;
                sessionStorage.setItem('active_vax_session', activeSessionId);
            } else {
                activeSessionId = 'SHAH-2026-09-26_01';
            }
        }

        const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' })[0];
        if (session) {
            document.getElementById('headerSessionId').innerText = session.id;
            document.getElementById('headerFacility').innerText = `${session.facility} • Lead: ${session.vaccinator}`;
        }

        // Fetch vaccinations for this session
        const rows = db.exec({ sql: 'SELECT * FROM Vaccinations WHERE session_id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('childTableBody');
        const badge = document.getElementById('childCountBadge');
        if (badge) badge.innerText = `${rows.length} Children`;

        if (!tbody) return;
        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-6 px-6 text-center text-slate-400 italic">No children vaccinated in this session yet. Click 'Register Child &amp; Vaccinate' above.</td></tr>`;
            return;
        }

        rows.forEach(r => {
            tbody.innerHTML += `
                <tr class="hover:bg-blue-50/20 transition">
                    <td class="py-4 px-6 font-bold text-slate-900">${r.child_name}<br><span class="text-xs font-mono text-blue-600">ID: ${r.id}</span></td>
                    <td class="py-4 px-6 text-slate-600 text-xs">${r.dob}</td>
                    <td class="py-4 px-6 text-slate-600 text-xs">${r.contact}</td>
                    <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">${r.vaccine}</span></td>
                    <td class="py-4 px-6 font-mono text-xs text-slate-600">${r.batch}</td>
                    <td class="py-4 px-6 text-right">
                        <button type="button" onclick="window.deleteVaccinationRecord('${r.id}')" class="text-xs text-rose-600 hover:underline font-bold">Remove</button>
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
        console.error("Error rendering vaccinations:", err);
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

    const childId = "CHD-" + Math.floor(1000 + Math.random() * 9000);
    const name = document.getElementById('childName').value;
    const dob = document.getElementById('childDob').value;
    const contact = document.getElementById('childContact').value;
    const vaccine = document.getElementById('childVaccine').value;
    const batch = document.getElementById('childBatch').value;

    db.exec({
        sql: 'INSERT INTO Vaccinations (id, session_id, child_name, dob, contact, vaccine, batch) VALUES (?, ?, ?, ?, ?, ?, ?);',
        bind: [childId, activeSessionId, name, dob, contact, vaccine, batch]
    });

    window.closeChildModal();
    renderVaccinations();
    await postToCloud('Vaccinations', { id: childId, session_id: activeSessionId, child_name: name, dob, contact, vaccine, batch, uniqueKey: 'id' });
}

window.deleteVaccinationRecord = function(id) {
    const db = getDB();
    db.exec({ sql: 'DELETE FROM Vaccinations WHERE id = ?;', bind: [id] });
    renderVaccinations();
    postToCloud('deleteVaccination', { id, uniqueKey: 'id' });
}

window.addEventListener('vaxflow-db-ready', () => {
    renderVaccinations();
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderVaccinations, 600);
});
