import { initDatabase, getDB } from './db.js';
import { syncFromCloud } from './cloud.js';
import { renderSessions } from './sessions.js';
import { renderStaff } from './staff.js';
import { renderStock } from './stock.js';

let currentTab = 'home';

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

window.switchTab = function(tab) {
    currentTab = tab;
    const viewSession = document.getElementById('view-session');
    if (viewSession) {
        viewSession.classList.add('hidden');
        viewSession.classList.remove('flex');
    }
    
    ['tab-home', 'tab-sessions', 'tab-staff', 'tab-stock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    ['nav-home', 'nav-sessions', 'nav-staff', 'nav-stock'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'text-xs font-medium text-slate-500 py-3 border-b-2 border-transparent transition';
    });

    const actionContainer = document.getElementById('headerActionBtnContainer');
    if (actionContainer) actionContainer.innerHTML = '';

    if (tab === 'home') {
        const el = document.getElementById('tab-home');
        if (el) el.classList.remove('hidden');
        const nav = document.getElementById('nav-home');
        if (nav) nav.className = 'text-xs font-semibold text-slate-900 py-3 border-b-2 border-indigo-600 transition';
        updateHomeStats();
    } else if (tab === 'sessions') {
        const el = document.getElementById('tab-sessions');
        if (el) el.classList.remove('hidden');
        const nav = document.getElementById('nav-sessions');
        if (nav) nav.className = 'text-xs font-semibold text-slate-900 py-3 border-b-2 border-indigo-600 transition';
        if (actionContainer) actionContainer.innerHTML = `<button onclick="window.openSessionModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-indigo-600/20">+ Initialize Session</button>`;
        renderSessions();
    } else if (tab === 'staff') {
        const el = document.getElementById('tab-staff');
        if (el) el.classList.remove('hidden');
        const nav = document.getElementById('nav-staff');
        if (nav) nav.className = 'text-xs font-semibold text-slate-900 py-3 border-b-2 border-indigo-600 transition';
        if (actionContainer) actionContainer.innerHTML = `<button onclick="window.openStaffModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-indigo-600/20">+ Register Staff</button>`;
        renderStaff();
    } else if (tab === 'stock') {
        const el = document.getElementById('tab-stock');
        if (el) el.classList.remove('hidden');
        const nav = document.getElementById('nav-stock');
        if (nav) nav.className = 'text-xs font-semibold text-slate-900 py-3 border-b-2 border-indigo-600 transition';
        if (actionContainer) actionContainer.innerHTML = `<button onclick="window.openStockModal()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-indigo-600/20">+ Add Stock Item</button>`;
        renderStock();
    }
}

function updateHomeStats() {
    const db = getDB();
    if (!db) return;
    try {
        const sessionsCount = db.exec({ sql: 'SELECT COUNT(*) as cnt FROM Sessions;', rowMode: 'object', returnValue: 'resultRows' })[0].cnt;
        const staffCount = db.exec({ sql: 'SELECT COUNT(*) as cnt FROM Staff;', rowMode: 'object', returnValue: 'resultRows' })[0].cnt;
        const stockCount = db.exec({ sql: 'SELECT COUNT(*) as cnt FROM Stock;', rowMode: 'object', returnValue: 'resultRows' })[0].cnt;

        const sEl = document.getElementById('homeStatSessions');
        const stEl = document.getElementById('homeStatStaff');
        const stkEl = document.getElementById('homeStatStock');
        if (sEl) sEl.innerText = sessionsCount;
        if (stEl) stEl.innerText = staffCount;
        if (stkEl) stkEl.innerText = stockCount;
    } catch (e) {
        console.error("Error loading home stats", e);
    }
}

window.returnToHome = function() {
    const viewSession = document.getElementById('view-session');
    if (viewSession) {
        viewSession.classList.add('hidden');
        viewSession.classList.remove('flex');
    }
    switchTab('home');
}

async function bootstrap() {
    try {
        checkDeviceAccess();

        const loadingText = document.getElementById('loadingStatusText');
        
        // Initialize local SQLite WASM instantly with feedback
        if (loadingText) loadingText.innerText = 'Loading SQLite database core...';
        await initDatabase((msg) => {
            if (loadingText) loadingText.innerText = msg;
        });

        // Drop loading gate immediately so app opens without waiting for cloud
        const gate = document.getElementById('loadingGate');
        if (gate) {
            gate.style.opacity = '0';
            gate.style.transition = 'opacity 0.3s ease';
            setTimeout(() => gate.remove(), 300);
        }

        switchTab('home');
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Syncing Cloud...`;
        }

        // Background Google Sheets Mirror Sync (Non-blocking)
        syncFromCloud(getDB()).then(() => {
            if (currentTab === 'home') updateHomeStats();
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span> Cloud Sync Active`;
            }
        }).catch(err => {
            console.error("Background sync notice:", err);
            if (statusEl) {
                statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Offline Mode`;
            }
        });

    } catch (err) {
        if (err.message && err.message.includes("Access denied")) return;
        console.error("Initialization failed:", err);
        const loadingText = document.getElementById('loadingStatusText');
        if (loadingText) {
            loadingText.innerHTML = `<span style="color: #ef4444; font-weight: bold;">Initialization Error:</span><br>${err.message}`;
        }
    }
}

bootstrap();
