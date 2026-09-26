import { getDB } from './db.v2.1.js';
import { postToCloud } from './cloud.v2.1.js';

document.addEventListener('vaxflow-db-ready', () => {
    initRegisterModule();
});

function initRegisterModule() {
    const form = document.getElementById('registrationForm');
    if (!form) return;

    // Auto-generate a unique beneficiary ID on load if input is empty
    const benIdInput = document.getElementById('beneficiary_id');
    if (benIdInput && !benIdInput.value) {
        benIdInput.value = 'BEN-' + Date.now().toString().slice(-6);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const payload = {};
        formData.forEach((value, key) => { payload[key] = value.trim(); });

        // Ensure mandatory identifiers are present
        if (!payload.beneficiary_id) {
            payload.beneficiary_id = 'BEN-' + Date.now().toString().slice(-6);
        }
        if (!payload.eir_id) {
            alert('Error: EIR ID is required for registration.');
            return;
        }

        payload.uniqueKey = 'beneficiary_id';
        payload.registration_date = payload.registration_date || new Date().toISOString();
        payload.sync_status = 'pending';

        const db = getDB();
        if (!db) {
            alert('Database not initialized.');
            return;
        }

        try {
            // 1. Write/Upsert to Local SQLite WASM (Source of Truth)
            db.exec({
                sql: `INSERT OR REPLACE INTO beneficiaries (
                    beneficiary_id, eir_id, foolhumaa_form_number, beneficiary_national_id, 
                    currently_living, beneficiary_name, dob, sex, country, atoll_island_residence, 
                    current_address, mother_name, mother_national_id, primary_contact, caregiver_name, 
                    caregiver_id, caregiver_contact, gestational_age_weeks, birth_weight, delivery_mode, 
                    number_delivered, birth_facility, HepB_Within24h, remarks, registration_date, sync_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [
                    payload.beneficiary_id,
                    payload.eir_id,
                    payload.foolhumaa_form_number || '',
                    payload.beneficiary_national_id || '',
                    payload.currently_living || 'Sh. Funadhoo',
                    payload.beneficiary_name,
                    payload.dob,
                    payload.sex,
                    payload.country || 'Maldives',
                    payload.atoll_island_residence || '',
                    payload.current_address || '',
                    payload.mother_name || '',
                    payload.mother_national_id || '',
                    payload.primary_contact || '',
                    payload.caregiver_name || '',
                    payload.caregiver_id || '',
                    payload.caregiver_contact || '',
                    payload.gestational_age_weeks ? Number(payload.gestational_age_weeks) : null,
                    payload.birth_weight ? Number(payload.birth_weight) : null,
                    payload.delivery_mode || '',
                    payload.number_delivered ? Number(payload.number_delivered) : 1,
                    payload.birth_facility || '',
                    payload.HepB_Within24h || 'Pending',
                    payload.remarks || '',
                    payload.registration_date,
                    'pending'
                ]
            });

            // 2. Trigger non-blocking background push to the Google Sheet cloud mirror
            postToCloud('beneficiaries', payload).then(() => {
                db.exec({
                    sql: 'UPDATE beneficiaries SET sync_status = ? WHERE beneficiary_id = ?;',
                    bind: ['synced', payload.beneficiary_id]
                });
            }).catch(err => {
                console.warn('Cloud sync queued for later (offline):', err);
            });

            alert('Beneficiary successfully registered and saved locally!');
            form.reset();
            
            // Refresh form ID for next entry
            if (benIdInput) {
                benIdInput.value = 'BEN-' + Date.now().toString().slice(-6);
            }

            window.dispatchEvent(new CustomEvent('beneficiary-registered', { detail: payload }));

        } catch (err) {
            console.error('Registration failed:', err);
            alert('Failed to save registration: ' + err.message);
        }
    });
}
