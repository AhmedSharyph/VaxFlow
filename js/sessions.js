import { getDB } from './db.js';
import { postToCloud } from './cloud.js';

let activeSessionId = null;
let isSessionEditing = false;

export function renderSessions() {
    const db = getDB();
    const rows = db.exec({ sql: 'SELECT * FROM Sessions;', rowMode: 'object', returnValue: 'resultRows' });
    const tbody = document.getElementById('sessionsTableBody');
    document.getElementById('statTotalSessions').innerText = rows.length;
    document.getElementById('sessionCountBadge').innerText = `${rows.length} Records`;
    
    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 px-6 text-center text-gray-400 italic">No sessions found in local database. Click 'Initialize Session' above.</td></tr>`;
        return;
    }

    rows.forEach(r => {
        const isOpen = Number(r.is_open) === 1;
        const statusBadge = isOpen 
            ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Open</span>`
            : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Closed</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition cursor-pointer" onclick="window.openSessionView('${r.id}')">
                <td class="py-4 px-6 font-mono font-medium text-gray-900">${r.id}</td>
                <td class="py-4 px-6 text-gray-600">${r.facility}</td>
                <td class="py-4 px-6 text-gray-600">${r.vaccinator}</td>
                <td class="py-4 px-6 text-center">${statusBadge}</td>
                <td class="py-4 px-6 text-right"><span class="text-xs text-indigo-600 font-medium hover:underline">View &rarr;</span></td>
            </tr>
        `;
    });
}

window.openSessionView = function(id) {
    activeSessionId = id;
    document.getElementById('tab-sessions').classList.add('hidden');
    document.getElementById('tab-staff').classList.add('hidden');
    document.getElementById('tab-stock').classList.add('hidden');
    document.getElementById('view-session').classList.remove('hidden');
    document.getElementById('headerModeBadge').innerText = "Active Workspace";

    const db = getDB();
    const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [id], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!session) return;

    document.getElementById('activeSessionTitle').innerText = session.id;
    document.getElementById('activeSessionSub').innerText = `${session.facility} • Lead: ${session.vaccinator}`;
    document.getElementById('detailFacility').innerText = session.facility;
    document.getElementById('detailVaccinator').innerText = session.vaccinator;

    const isOpen = Number(session.is_open) === 1;
    const statusEl = document.getElementById('detailStatus');
    const toggleBtn = document.getElementById('toggleStatusBtn');

    if (isOpen) {
        statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Open Session</span>`;
        toggleBtn.innerText = "Close Session";
        toggleBtn.className = "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition shadow-sm";
    } else {
        statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Closed Session</span>`;
        toggleBtn.innerText = "Reopen Session";
        toggleBtn.className = "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition shadow-sm";
    }
}

window.toggleActiveSessionStatus = function() {
    const db = getDB();
    const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!session) return;
    const newStatus = Number(session.is_open) === 1 ? 0 : 1;

    db.exec({ sql: 'UPDATE Sessions SET is_open = ? WHERE id = ?;', bind: [newStatus, activeSessionId] });
    window.openSessionView(activeSessionId);
    postToCloud('Sessions', { id: session.id, facility: session.facility, vaccinator: session.vaccinator, is_open: newStatus, uniqueKey: 'id' });
}

window.openSessionModal = function() {
    isSessionEditing = false;
    document.getElementById('sessionModalTitle').innerText = "Initialize New Session";
    document.getElementById('sessionModalSubmitBtn').innerText = "Save Session";
    document.getElementById('sessionId').disabled = false;
    document.getElementById('sessionForm').reset();
    document.getElementById('sessionId').value = "SHAH-2026-09-25_02";
    document.getElementById('facility').value = "Shaviyani Funadhoo Health Center";
    document.getElementById('vaccinator').value = "Nurse Aminath";
    document.getElementById('sessionModal').classList.remove('hidden');
    document.getElementById('sessionModal').classList.add('flex');
}

window.openEditSessionModal = function() {
    isSessionEditing = true;
    const db = getDB();
    const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!session) return;

    document.getElementById('sessionModalTitle').innerText = "Edit Session Particulars";
    document.getElementById('sessionModalSubmitBtn').innerText = "Update Session";
    document.getElementById('sessionId').value = session.id;
    document.getElementById('sessionId').disabled = true;
    document.getElementById('facility').value = session.facility;
    document.getElementById('vaccinator').value = session.vaccinator;
    document.getElementById('sessionModal').classList.remove('hidden');
    document.getElementById('sessionModal').classList.add('flex');
}

window.closeSessionModal = function() {
    document.getElementById('sessionModal').classList.add('hidden');
    document.getElementById('sessionModal').classList.remove('flex');
}

window.handleSessionSubmit = async function(event) {
    event.preventDefault();
    const db = getDB();
    const id = document.getElementById('sessionId').value;
    const facility = document.getElementById('facility').value;
    const vaccinator = document.getElementById('vaccinator').value;

    db.exec({
        sql: 'INSERT OR REPLACE INTO Sessions (id, facility, vaccinator, is_open) VALUES (?, ?, ?, COALESCE((SELECT is_open FROM Sessions WHERE id = ?), 1));',
        bind: [id, facility, vaccinator, id]
    });

    closeSessionModal();
    if (activeSessionId) window.openSessionView(activeSessionId);
    else renderSessions();
    postToCloud('Sessions', { id, facility, vaccinator, is_open: 1, uniqueKey: 'id' });
}