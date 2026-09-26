import { getDB } from './db.v2.1.js';
import { postToCloud } from './cloud.v2.1.js';

export async function injectDummyData() {
    const db = getDB();
    if (!db) {
        console.error("Database not ready for seeding.");
        return;
    }

    console.log("🌱 Injecting VaxFlow test data...");

    const mockData = {
        beneficiaries: [
            {
                beneficiary_id: "BEN-2026-001",
                eir_id: "EIR-SH-2026-101",
                foolhumaa_form_number: "FLH-9821",
                beneficiary_national_id: "A-293841",
                currently_living: "Sh. Funadhoo",
                beneficiary_name: "Aayan Ahmed",
                dob: "2026-01-15",
                sex: "Male",
                country: "Maldives",
                atoll_island_residence: "Sh. Funadhoo",
                current_address: "Mariyaadh, Sh. Funadhoo",
                mother_name: "Fathimath Nashwa",
                mother_national_id: "A-182938",
                primary_contact: "7912345",
                caregiver_name: "Ahmed Shareef",
                caregiver_id: "A-123456",
                caregiver_contact: "7912345",
                gestational_age_weeks: 39,
                birth_weight: 3.2,
                delivery_mode: "Normal Vaginal",
                number_delivered: 1,
                birth_facility: "Shaviyani Atoll Hospital",
                HepB_Within24h: "Yes",
                remarks: "Healthy infant, normal APGAR score.",
                uniqueKey: "beneficiary_id"
            },
            {
                beneficiary_id: "BEN-2026-002",
                eir_id: "EIR-SH-2026-102",
                foolhumaa_form_number: "FLH-9822",
                beneficiary_national_id: "A-293842",
                currently_living: "Sh. Funadhoo",
                beneficiary_name: "Aisha Mariyam",
                dob: "2026-02-10",
                sex: "Female",
                country: "Maldives",
                atoll_island_residence: "Sh. Funadhoo",
                current_address: "Fehivina, Sh. Funadhoo",
                mother_name: "Aminath Zeena",
                mother_national_id: "A-192837",
                primary_contact: "7823456",
                caregiver_name: "Hussain Mohamed",
                caregiver_id: "A-654321",
                caregiver_contact: "7823456",
                gestational_age_weeks: 38,
                birth_weight: 2.9,
                delivery_mode: "Cesarean",
                number_delivered: 1,
                birth_facility: "Shaviyani Atoll Hospital",
                HepB_Within24h: "Yes",
                remarks: "Routine follow-up scheduled.",
                uniqueKey: "beneficiary_id"
            }
        ],
        Staff: [
            { id: "STF-001", name: "Ahmed Shareef", role: "Administrator", designation: "Immunization Focal Point", contact: "7912345", is_disabled: 0, uniqueKey: "id" },
            { id: "STF-002", name: "Nurse Aminath", role: "Vaccinator", designation: "Senior Registered Nurse", contact: "7811122", is_disabled: 0, uniqueKey: "id" }
        ],
        Stock: [
            { item_id: "VACC-BCG-01", category: "Vaccines", name: "BCG Vaccine", batch: "BCG2026A", expiry: "2027-06-30", opening: 100, used: 15, wasted: 2, linked_accessory: "Diluent 1ml", uniqueKey: "item_id" },
            { item_id: "VACC-OPV-01", category: "Vaccines", name: "Oral Polio Vaccine (OPV)", batch: "OPV2026B", expiry: "2027-12-31", opening: 250, used: 40, wasted: 5, linked_accessory: "Dropper", uniqueKey: "item_id" },
            { item_id: "VACC-PENTA-01", category: "Vaccines", name: "Pentavalent (DTP-HepB-Hib)", batch: "PEN2026X", expiry: "2027-09-15", opening: 150, used: 22, wasted: 1, linked_accessory: "Syringe 0.5ml", uniqueKey: "item_id" }
        ],
        Sessions: [
            { id: "SES-2026-09-26_01", facility: "Shaviyani Funadhoo Health Center", vaccinator: "Nurse Aminath", is_open: 1, session_date: "2026-09-26", uniqueKey: "id" }
        ],
        ColdChain: [
            { equipment_id: "CC-REF-01", equipment_name: "Main Vaccine Refrigerator (Vestfrost)", equipment_type: "Refrigerator", temperature: 4.2, status: "Optimal", last_checked: "2026-09-26 08:00", remarks: "Within safe +2°C to +8°C range.", uniqueKey: "equipment_id" }
        ],
        Tally: [
            { tally_id: "TAL-2026-001", tally_date: "2026-09-26", session_id: "SES-2026-09-26_01", vaccine_code: "BCG", dose_number: "Dose 1", age_group: "0-11 months", count: 5, facility: "Shaviyani Funadhoo Health Center", remarks: "Morning session tallies", uniqueKey: "tally_id" }
        ]
    };

    try {
        // 1. Seed Beneficiaries
        mockData.beneficiaries.forEach(b => {
            db.exec({
                sql: `INSERT OR REPLACE INTO beneficiaries (beneficiary_id, eir_id, foolhumaa_form_number, beneficiary_national_id, currently_living, beneficiary_name, dob, sex, country, atoll_island_residence, current_address, mother_name, mother_national_id, primary_contact, caregiver_name, caregiver_id, caregiver_contact, gestational_age_weeks, birth_weight, delivery_mode, number_delivered, birth_facility, HepB_Within24h, remarks, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [b.beneficiary_id, b.eir_id, b.foolhumaa_form_number, b.beneficiary_national_id, b.currently_living, b.beneficiary_name, b.dob, b.sex, b.country, b.atoll_island_residence, b.current_address, b.mother_name, b.mother_national_id, b.primary_contact, b.caregiver_name, b.caregiver_id, b.caregiver_contact, b.gestational_age_weeks, b.birth_weight, b.delivery_mode, b.number_delivered, b.birth_facility, b.HepB_Within24h, b.remarks, 'pending']
            });
            postToCloud('beneficiaries', b);
        });

        // 2. Seed Staff
        mockData.Staff.forEach(st => {
            db.exec({
                sql: `INSERT OR REPLACE INTO Staff (id, name, role, designation, contact, is_disabled, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?);`,
                bind: [st.id, st.name, st.role, st.designation, st.contact, st.is_disabled, 'pending']
            });
            postToCloud('Staff', st);
        });

        // 3. Seed Stock
        mockData.Stock.forEach(stk => {
            db.exec({
                sql: `INSERT OR REPLACE INTO Stock (item_id, category, name, batch, expiry, opening, used, wasted, linked_accessory, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [stk.item_id, stk.category, stk.name, stk.batch, stk.expiry, stk.opening, stk.used, stk.wasted, stk.linked_accessory, 'pending']
            });
            postToCloud('Stock', stk);
        });

        // 4. Seed Sessions
        mockData.Sessions.forEach(s => {
            db.exec({
                sql: `INSERT OR REPLACE INTO Sessions (id, facility, vaccinator, is_open, session_date, sync_status) VALUES (?, ?, ?, ?, ?, ?);`,
                bind: [s.id, s.facility, s.vaccinator, s.is_open, s.session_date, 'pending']
            });
            postToCloud('Sessions', s);
        });

        // 5. Seed Cold Chain
        mockData.ColdChain.forEach(cc => {
            db.exec({
                sql: `INSERT OR REPLACE INTO ColdChain (equipment_id, equipment_name, equipment_type, temperature, status, last_checked, remarks, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [cc.equipment_id, cc.equipment_name, cc.equipment_type, cc.temperature, cc.status, cc.last_checked, cc.remarks, 'pending']
            });
            postToCloud('ColdChain', cc);
        });

        // 6. Seed Tally
        mockData.Tally.forEach(t => {
            db.exec({
                sql: `INSERT OR REPLACE INTO Tally (tally_id, tally_date, session_id, vaccine_code, dose_number, age_group, count, facility, remarks, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                bind: [t.tally_id, t.tally_date, t.session_id, t.vaccine_code, t.dose_number, t.age_group, t.count, t.facility, t.remarks, 'pending']
            });
            postToCloud('Tally', t);
        });

        console.log("✅ Dummy test data successfully injected and queued for cloud sync!");
        alert("Dummy test data injected successfully! Check your dashboard counters.");
        window.location.reload();

    } catch (err) {
        console.error("Failed to seed dummy data:", err);
        alert("Error seeding data: " + err.message);
    }
}

// Automatically bind a global trigger for easy testing via console
window.seedVaxFlowData = injectDummyData;
