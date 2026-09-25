import { getDB } from './db.js';
import { postToCloud } from './cloud.js';

let isStaffEditing = false;

export function renderStaff() {
    try {
        const db = getDB();
        const rows = db.exec({ sql: 'SELECT * FROM Staff;', rowMode: 'object', returnValue: 'resultRows' });
        const tbody = document.getElementById('staffTableBody');
        
        const totalStat = document.getElementById('statTotalStaff');
        if (totalStat) totalStat.innerText = rows.length;

        const countBadge = document.getElementById('staffCountBadge');
        if (countBadge) countBadge.innerText = `${rows.length} Records`;
        
        if (!tbody) return;
        tbody.innerHTML = '';

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-6 px-6 text-center text-gray-400 italic">No staff members registered. Click 'Register Staff' above.</td></tr>`;
            return;
        }

        rows.forEach(r => {
            const isDisabled = Number(r.is_disabled) === 1;
            const statusBadge = isDisabled 
                ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Disabled</span>`
                : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active</span>`;

            const roleColor = r.role === 'Supervisor' ? 'bg-purple-50 text-purple-700' : (r.role === 'Vaccinator' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700');

            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 transition">
                    <td class="py-4 px-6 font-mono font-medium text-gray-900">${r.id}</td>
                    <td class="py-4 px-6 font-medium text-gray-900">${r.name}</td>
                    <td class="py-4 px-6"><span class="px-2.5 py-0.5 rounded-md text-xs font-semibold ${roleColor}">${r.role}</span></td>
                    <td class="py-4 px-6 text-gray-600">${r.designation}</td>
                    <td class="py-4 px-6 text-center">${statusBadge}</td>
                    <td class="py-4 px-6 text-right space-x-3">
                        <button onclick="window.openStaffModal('${r.id}')" class="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
                        <button onclick="window.toggleStaffStatus('${r.id}')" class="text-xs ${isDisabled ? 'text-emerald-600' : 'text-rose-600'} font-medium">${isDisabled ? 'Enable' : 'Disable'}</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.log("Waiting for database initialization...", err);
    }
}

window.openStaffModal = function(staffId = null) {
    const form = document.getElementById('staffForm');
    if (form) form.reset();
    const db = getDB();

    if (staffId) {
        isStaffEditing = true;
        const staff = db.exec({ sql: 'SELECT * FROM Staff WHERE id = ?;', bind: [staffId], rowMode: 'object', returnValue: 'resultRows' })[0];
        if (!staff) return;
        document.getElementById('staffModalTitle').innerText = "Edit Staff Member";
        document.getElementById('staffModalSubmitBtn').innerText = "Update Staff";
        document.getElementById('staffId').value = staff.id;
        document.getElementById('staffId').disabled = true;
        document.getElementById('staffName').value = staff.name;
        document.getElementById('staffRole').value = staff.role;
        document.getElementById('staffDesignation').value = staff.designation;
    } else {
        isStaffEditing = false;
        document.getElementById('staffModalTitle').innerText = "Register Staff Member";
        document.getElementById('staffModalSubmitBtn').innerText = "Save Staff";
        document.getElementById('staffId').disabled = false;
        document.getElementById('staffId').value = "STF-" + Math.floor(100 + Math.random() * 900);
    }
    const modal = document.getElementById('staffModal');
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
    const id = document.getElementById('staffId').value;
    const name = document.getElementById('staffName').value;
    const role = document.getElementById('staffRole').value;
    const designation = document.getElementById('staffDesignation').value;

    db.exec({
        sql: 'INSERT OR REPLACE INTO Staff (id, name, role, designation, is_disabled) VALUES (?, ?, ?, ?, COALESCE((SELECT is_disabled FROM Staff WHERE id = ?), 0));',
        bind: [id, name, role, designation, id]
    });

    closeStaffModal();
    renderStaff();
    postToCloud('Staff', { id, name, role, designation, is_disabled: 0, uniqueKey: 'id' });
}

window.toggleStaffStatus = function(id) {
    const db = getDB();
    const staff = db.exec({ sql: 'SELECT * FROM Staff WHERE id = ?;', bind: [id], rowMode: 'object', returnValue: 'resultRows' })[0];
    if (!staff) return;

    const newDisabled = Number(staff.is_disabled) === 1 ? 0 : 1;
    db.exec({ sql: 'UPDATE Staff SET is_disabled = ? WHERE id = ?;', bind: [newDisabled, id] });
    renderStaff();
    postToCloud('Staff', { id: staff.id, name: staff.name, role: staff.role, designation: staff.designation, is_disabled: newDisabled, uniqueKey: 'id' });
}

// Automatically trigger renderStaff once database and DOM are ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderStaff, 600);
});
