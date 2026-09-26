import { getDB } from './db.v2.js';
import { postToCloud } from './cloud.v2.js';

let isStaffEditing = false;
let editingStaffId = null;
let currentSearchTerm = '';

export function renderStaff() {
    const db = getDB();
    if (!db) {
        setTimeout(renderStaff, 200);
        return;
    }

    try {
        const rows = db.exec({ sql: 'SELECT * FROM Staff;', rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('staffTableBody');
        const badge = document.getElementById('staffCountBadge');
        if (badge) badge.innerText = `${rows.length} Staff`;

        if (!tbody) return;
        tbody.innerHTML = '';

        const filteredRows = rows.filter(r => {
            if (!currentSearchTerm) return true;
            const term = currentSearchTerm.toLowerCase();
            return (
                (r.name && r.name.toLowerCase().includes(term)) ||
                (r.role && r.role.toLowerCase().includes(term)) ||
                (r.contact && r.contact.toLowerCase().includes(term)) ||
                (r.id && r.id.toLowerCase().includes(term))
            );
        });

        if (filteredRows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 px-6 text-center text-slate-400 italic">No registered staff found. Click 'Register Staff Member' above.</td></tr>`;
            removeGate();
            return;
        }

        filteredRows.forEach(r => {
            let roleBadge = 'bg-blue-50 text-blue-700 border border-blue-200';
            if (r.role === 'Immunization Focal Point') roleBadge = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
            else if (r.role === 'Lead Vaccinator') roleBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';

            tbody.innerHTML += `
                <tr class="hover:bg-blue-50/20 transition">
                    <td class="py-4 px-6 font-bold text-slate-900">${r.name}<br><span class="text-xs font-mono text-blue-600">ID: ${r.id}</span></td>
                    <td class="py-4 px-6"><span class="px-2.5 py-1 rounded-lg text-xs font-semibold ${roleBadge}">${r.role}</span></td>
                    <td class="py-4 px-6 text-slate-600 font-mono text-xs">${r.contact}</td>
                    <td class="py-4 px-6 text-right space-x-3">
                        <button type="button" onclick="window.openStaffModal('${r.id}')" class="text-xs text-blue-600 hover:underline font-bold cursor-pointer">Edit</button>
                        <button type="button" onclick="window.deleteStaffItem('${r.id}')" class="text-xs text-rose-600 hover:underline font-bold cursor-pointer">Delete</button>
                    </td>
                </tr>
            `;
        });

        removeGate();
    } catch (err) {
        console.error("Error rendering staff:", err);
        removeGate();
    }
}

function removeGate() {
    const gate = document.getElementById('loadingGate');
    if (gate) {
        gate.style.opacity = '0';
        gate.style.transition = 'opacity 0.3s ease';
        setTimeout(() => gate.remove(), 300);
    }
}

window.openStaffModal = function(staffId = null) {
    const form = document.getElementById('staffForm');
    if (form) form.reset();
    const db = getDB();
    const titleEl = document.getElementById('staffModalTitle');
    const modal = document.getElementById('staffModal');

    if (staffId !== null && staffId !== undefined) {
        isStaffEditing = true;
        editingStaffId = staffId;
        const staff = db.exec({ sql: 'SELECT * FROM Staff WHERE id = ?;', bind: [staffId], rowMode: 'object', returnValue: 'resultRows' })[0];
        if (!staff) return;

        if (titleEl) titleEl.innerText = "Edit Staff Member";
        if (document.getElementById('staffName')) document.getElementById('staffName').value = staff.name;
        if (document.getElementById('staffRole')) document.getElementById('staffRole').value = staff.role;
        if (document.getElementById('staffContact')) document.getElementById('staffContact').value = staff.contact;
    } else {
        isStaffEditing = false;
        editingStaffId = null;
        if (titleEl) titleEl.innerText = "Register Staff Member";
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeStaffModal = function() {
    const modal = document.getElementById('staffModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

window.handleStaffSubmit = async function(event) {
    event.preventDefault();
    const db = getDB();
    if (!db) return;

    const name = document.getElementById('staffName').value;
    const role = document.getElementById('staffRole').value;
    const contact = document.getElementById('staffContact').value;

    let staffId = editingStaffId;
    if (!isStaffEditing || !staffId) {
        staffId = "STF-" + Math.floor(1000 + Math.random() * 9000);
    }

    if (isStaffEditing && editingStaffId) {
        db.exec({
            sql: 'UPDATE Staff SET name = ?, role = ?, contact = ? WHERE id = ?;',
            bind: [name, role, contact, editingStaffId]
        });
    } else {
        db.exec({
            sql: 'INSERT INTO Staff (id, name, role, contact) VALUES (?, ?, ?, ?);',
            bind: [staffId, name, role, contact]
        });
    }

    const savedStaff = db.exec({ sql: 'SELECT * FROM Staff WHERE id = ?;', bind: [staffId], rowMode: 'object', returnValue: 'resultRows' })[0];

    window.closeStaffModal();
    renderStaff();
    await postToCloud('Staff', { ...savedStaff, uniqueKey: 'id' });
}

window.deleteStaffItem = function(id) {
    const db = getDB();
    if (!db) return;
    db.exec({ sql: 'DELETE FROM Staff WHERE id = ?;', bind: [id] });
    renderStaff();
    postToCloud('deleteStaff', { id, uniqueKey: 'id' });
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('staffSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.trim();
            renderStaff();
        });
    }
    setTimeout(renderStaff, 500);
    setTimeout(removeGate, 1200);
});

window.addEventListener('vaxflow-db-ready', () => {
    renderStaff();
});
