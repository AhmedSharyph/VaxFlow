import { getDB } from './db.js';
import { postToCloud } from './cloud.js';

let activeSessionId = null;
let isSessionEditing = false;

export function renderSessions() {
    try {
        const db = getDB();
        const rows = db.exec({ sql: 'SELECT * FROM Sessions;', rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('sessionsTableBody');
        
        const totalSessions = document.getElementById('statTotalSessions');
        if (totalSessions) totalSessions.innerText = rows.length;

        const sessionBadge = document.getElementById('sessionCountBadge');
        if (sessionBadge) sessionBadge.innerText = `${rows.length} Records`;
        
        if (!tbody) return;
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
    } catch (err) {
        console.log("Waiting for database initialization...", err);
    }
}

window.openSessionView = function(id) {
    activeSessionId = id;
    const tabSessions = document.getElementById('tab-sessions');
    const tabStaff = document.getElementById('tab-staff');
    const tabStock = document.getElementById('tab-stock');
    const viewSession = document.getElementById('view-session');
    const headerModeBadge = document.getElementById('headerModeBadge');

    if (tabSessions) tabSessions.classList.add('hidden');
    if (tabStaff) tabStaff.classList.add('hidden');
    if (tabStock) tabStock.classList.add('hidden');
    if (viewSession) viewSession.classList.remove('hidden');
    if (headerModeBadge) headerModeBadge.innerText = "Active Workspace";

    const db = getDB();
    const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [id], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!session) return;

    const titleEl = document.getElementById('activeSessionTitle');
    const subEl = document.getElementById('activeSessionSub');
    const facilityEl = document.getElementById('detailFacility');
    const vaccinatorEl = document.getElementById('detailVaccinator');

    if (titleEl) titleEl.innerText = session.id;
    if (subEl) subEl.innerText = `${session.facility} • Lead: ${session.vaccinator}`;
    if (facilityEl) facilityEl.innerText = session.facility;
    if (vaccinatorEl) vaccinatorEl.innerText = session.vaccinator;

    const isOpen = Number(session.is_open) === 1;
    const statusEl = document.getElementById('detailStatus');
    const toggleBtn = document.getElementById('toggleStatusBtn');

    if (isOpen) {
        if (statusEl) statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Open Session</span>`;
        if (toggleBtn) {
            toggleBtn.innerText = "Close Session";
            toggleBtn.className = "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition shadow-sm";
        }
    } else {
        if (statusEl) statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Closed Session</span>`;
        if (toggleBtn) {
            toggleBtn.innerText = "Reopen Session";
            toggleBtn.className = "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition shadow-sm";
        }
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
    const titleEl = document.getElementById('sessionModalTitle');
    const submitBtn = document.getElementById('sessionModalSubmitBtn');
    const idEl = document.getElementById('sessionId');
    const form = document.getElementById('sessionForm');
    const modal = document.getElementById('sessionModal');

    if (titleEl) titleEl.innerText = "Initialize New Session";
    if (submitBtn) submitBtn.innerText = "Save Session";
    if (idEl) {
        idEl.disabled = false;
        idEl.value = "SHAH-2026-09-25_02";
    }
    if (form) form.reset();
    
    const facilityEl = document.getElementById('facility');
    const vaccinatorEl = document.getElementById('vaccinator');
    if (facilityEl) facilityEl.value = "Shaviyani Funadhoo Health Center";
    if (vaccinatorEl) vaccinatorEl.value = "Nurse Aminath";
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.openEditSessionModal = function() {
    isSessionEditing = true;
    const db = getDB();
    const session = db.exec({ sql: 'SELECT * FROM Sessions WHERE id = ?;', bind: [activeSessionId], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!session) return;

    const titleEl = document.getElementById('sessionModalTitle');
    const submitBtn = document.getElementById('sessionModalSubmitBtn');
    const idEl = document.getElementById('sessionId');
    const facilityEl = document.getElementById('facility');
    const vaccinatorEl = document.getElementById('vaccinator');
    const modal = document.getElementById('sessionModal');

    if (titleEl) titleEl.innerText = "Edit Session Particulars";
    if (submitBtn) submitBtn.innerText = "Update Session";
    if (idEl) {
        idEl.value = session.id;
        idEl.disabled = true;
    }
    if (facilityEl) facilityEl.value = session.facility;
    if (vaccinatorEl) vaccinatorEl.value = session.vaccinator;
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeSessionModal = function() {
    const modal = document.getElementById('sessionModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
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

// Automatically trigger renderSessions once DOM and SQLite WASM are ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderSessions, 600);
});
