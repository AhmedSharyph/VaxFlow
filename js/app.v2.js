import { initDatabase, getDB } from './db.v2.js';
import { syncFromCloud } from './cloud.v2.js';

function checkDeviceAccess() {
    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
    const isSmallScreen = window.innerWidth < 1024;

    if (isMobile || isSmallScreen) {
        document.body.innerHTML = `
            <div style="background-color: #0f172a; color: white; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; text-align: center; padding: 2rem;">
                <div style="max-width: 28rem; background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
                    <div style="font-size: 2.5rem; margin-bottom: 1rem;">💻🔒</div>
                    <h1 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.75rem;">Desktop Workstation Required</h1>
                    <p style="font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem;">
                        VaxFlow NIP is restricted exclusively to authorized desktop and laptop workstations at the Shaviyani Funadhoo Health Center. Mobile and tablet access is not permitted.
                    </p>
                </div>
            </div>
        `;
        throw new Error("Access denied: Non-desktop device blocked.");
    }
}

async function bootstrapV2() {
    try {
        checkDeviceAccess();

        // Initialize local SQLite WASM database
        await initDatabase();

        const statusEl = document.getElementById('status') || document.getElementById('sessionCountBadge') || document.getElementById('staffCountBadge');
        if (statusEl) {
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Syncing Cloud...`;
        }

        // Background Google Sheets Mirror Sync (Non-blocking)
        syncFromCloud(getDB()).then(() => {
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Cloud Sync Active`;
            }
            window.dispatchEvent(new CustomEvent('vaxflow-db-ready'));
        }).catch(err => {
            console.error("Background sync notice:", err);
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Offline Mode`;
            }
            window.dispatchEvent(new CustomEvent('vaxflow-db-ready'));
        });

    } catch (err) {
        if (err.message && err.message.includes("Access denied")) return;
        console.error("Initialization failed:", err);
    }
}

bootstrapV2();
