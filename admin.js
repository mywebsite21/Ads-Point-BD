import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Firebase App Config
const firebaseConfig = {
  apiKey: "AIzaSyAwS7AZewx0L8KRGeFXB7Jq4BJEbSB0xO0",
  authDomain: "fxgroup-5dd7c.firebaseapp.com",
  projectId: "fxgroup-5dd7c",
  storageBucket: "fxgroup-5dd7c.firebasestorage.app",
  messagingSenderId: "982128077012",
  appId: "1:982128077012:web:e5088b7be662cecf20f341",
  measurementId: "G-9FRXZNCJQJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
let globalUser = null;
let globalAdminData = null;
let myMembers = [];

// MASTER ADMIN EMAILS Setup (These emails bypass approval and can approve others)
const MASTER_ADMINS = ['pinakjoy50@gmail.com']; 

// UI Elements
const loadingOverlay = document.getElementById('loading');
const authView = document.getElementById('auth-view');
const pendingView = document.getElementById('pending-view');
const dashboardView = document.getElementById('dashboard-view');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');

// Auth View Toggle
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.classList.add('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authError.classList.add('hidden');
});

function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
}

// Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    
    try {
        loadingOverlay.classList.remove('hidden');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Define if this user should be master admin automatically
        const isMaster = MASTER_ADMINS.includes(email.toLowerCase());

        // Create Admin doc in Firestore
        await setDoc(doc(db, "admins", user.uid), {
            email: email,
            status: isMaster ? 'approved' : 'pending',
            customUrl: email.split('@')[0], // default suggestion
            telegramLink: "",
            role: isMaster ? 'master' : 'admin'
        });

        // Auth state listener handles the rest
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        showError(error.message);
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        loadingOverlay.classList.remove('hidden');
        await signInWithEmailAndPassword(auth, email, password);
        // Auth state listener handles the rest
    } catch (error) {
        loadingOverlay.classList.add('hidden');
        showError("Invalid email or password.");
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
document.getElementById('pending-logout-btn').addEventListener('click', () => signOut(auth));

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        globalUser = user;
        authView.classList.add('hidden');
        document.getElementById('sidebar-email').textContent = user.email;

        // Fetch user data from DB
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        
        if (adminDoc.exists()) {
            globalAdminData = adminDoc.data();
            
            if (globalAdminData.status === 'pending') {
                pendingView.classList.remove('hidden');
                dashboardView.classList.add('hidden');
                loadingOverlay.classList.add('hidden');
            } else if (globalAdminData.status === 'approved') {
                pendingView.classList.add('hidden');
                dashboardView.classList.remove('hidden');
                initDashboardUI();
                await loadDashboardData();
            }
        } else {
            showError("User record not found in database.");
            signOut(auth);
        }
    } else {
        // Not logged in
        globalUser = null;
        globalAdminData = null;
        loadingOverlay.classList.add('hidden');
        authView.classList.remove('hidden');
        pendingView.classList.add('hidden');
        dashboardView.classList.add('hidden');
    }
});

// Sidebar Navigation
function initDashboardUI() {
    // Show master tab if role is master
    if (globalAdminData && globalAdminData.role === 'master') {
        document.getElementById('master-nav-link').classList.remove('hidden');
    }

    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Reset Active classes
            navLinks.forEach(l => {
                l.classList.remove('bg-primary/10', 'text-primary');
                // Keep the yellow color for master link if inactive
                if(l.id !== 'master-nav-link') l.classList.add('text-slate-400');
            });

            // Activate clicked
            link.classList.add('bg-primary/10', 'text-primary');
            if(link.id === 'master-nav-link') {
                link.classList.remove('text-yellow-500'); // overriding with primary
            }

            // Show target section
            sections.forEach(sec => sec.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');

            if(targetId === 'panel-master') {
                loadMasterData();
            }
        });
    });

    // Switch to settings tab as default first view so they can see their URL
    document.querySelector('[data-target="panel-settings"]').click();
}

// Load Regular Dashboard Data
async function loadDashboardData() {
    loadingOverlay.classList.remove('hidden');

    // Populate Settings Form
    document.getElementById('setting-url').value = globalAdminData.customUrl || '';
    document.getElementById('setting-telegram').value = globalAdminData.telegramLink || '';

    // Fetch members referred by this admin
    const myUrl = globalAdminData.customUrl ? globalAdminData.customUrl.toLowerCase() : 'N/A';
    
    if (myUrl !== 'N/A') {
        const q = query(collection(db, "registrations"), where("referralAdmin", "==", myUrl));
        const querySnapshot = await getDocs(q);
        
        myMembers = [];
        querySnapshot.forEach((doc) => {
            myMembers.push(doc.data());
        });

        // Calculate Stats
        let todayCount = 0;
        let weekCount = 0;
        let monthCount = 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        myMembers.forEach(m => {
            const t = m.timestamp || 0;
            if (t >= startOfToday) todayCount++;
            if (t >= startOfWeek) weekCount++;
            if (t >= startOfMonth) monthCount++;
        });

        document.getElementById('stat-total').textContent = myMembers.length;
        document.getElementById('stat-today').textContent = todayCount;
        document.getElementById('stat-week').textContent = weekCount;
        document.getElementById('stat-month').textContent = monthCount;

        // Render Table
        const tbody = document.getElementById('members-table-body');
        if (myMembers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">No members found yet. Send traffic to your link!</td></tr>';
        } else {
            // Sort by latest
            myMembers.sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
            tbody.innerHTML = myMembers.map(m => `
                <tr class="hover:bg-slate-800 transition">
                    <td class="p-4 text-white">${m.fullName}</td>
                    <td class="p-4 text-cyan-400">${m.telegramUsername}</td>
                    <td class="p-4 text-slate-300">${m.whatsappNumber}</td>
                    <td class="p-4 text-slate-400 text-xs">${m.registrationDate} <br> ${m.registrationTime}</td>
                </tr>
            `).join('');
        }
    } else {
        document.getElementById('members-table-body').innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-400">Please set your Custom URL Slug first!</td></tr>';
    }

    loadingOverlay.classList.add('hidden');
}

// Update Settings Data
document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlVal = document.getElementById('setting-url').value.toLowerCase().trim();
    const tgVal = document.getElementById('setting-telegram').value.trim();
    const msgBox = document.getElementById('settings-msg');

    if (!urlVal) {
        msgBox.textContent = "Custom URL cannot be empty.";
        msgBox.className = "text-sm font-medium text-red-500 block";
        return;
    }

    try {
        const adminRef = doc(db, "admins", globalUser.uid);
        await updateDoc(adminRef, {
            customUrl: urlVal,
            telegramLink: tgVal
        });
        
        // Update local object
        globalAdminData.customUrl = urlVal;
        globalAdminData.telegramLink = tgVal;

        msgBox.textContent = "Settings saved successfully!";
        msgBox.className = "text-sm font-medium text-green-400 block";
        setTimeout(() => msgBox.classList.add('hidden'), 3000);

        // Reload data so table queries use new URL if changed
        loadDashboardData();
    } catch(err) {
        msgBox.textContent = "Failed to update settings.";
        msgBox.className = "text-sm font-medium text-red-500 block";
    }
});

// Master Admin Data Fetch
async function loadMasterData() {
    const tbody = document.getElementById('approvals-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">Loading...</td></tr>';
    
    // Only pending admins
    const q = query(collection(db, "admins"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">No pending requests right now.</td></tr>';
        return;
    }

    let rowsHtml = '';
    window.pendingAdminsArray = []; // quick hack to store context for button clicks
    
    querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const id = docSnap.id;
        rowsHtml += `
            <tr class="hover:bg-slate-800 transition" id="row-${id}">
                <td class="p-4 text-white">${d.email}</td>
                <td class="p-4 text-cyan-400">domain.com/${d.customUrl}</td>
                <td class="p-4"><span class="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-bold uppercase tracking-wider">Pending</span></td>
                <td class="p-4 text-right">
                    <button onclick="approveUser('${id}')" class="bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black px-4 py-1.5 rounded text-xs font-bold transition">
                        APPROVE
                    </button>
                    <button onclick="rejectUser('${id}')" class="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white px-4 py-1.5 rounded text-xs font-bold transition ml-2">
                        REJECT
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

// Approve / Reject actions (Attached to Window for inline onclick compatibility)
window.approveUser = async (uid) => {
    try {
        await updateDoc(doc(db, "admins", uid), { status: 'approved' });
        document.getElementById(`row-${uid}`).remove();
    } catch(err) {
        alert("Failed to approve user");
    }
};

window.rejectUser = async (uid) => {
    if(confirm("Are you sure you want to reject this admin?")) {
        try {
            await updateDoc(doc(db, "admins", uid), { status: 'rejected' });
            document.getElementById(`row-${uid}`).remove();
        } catch(err) {
            alert("Failed to reject user");
        }
    }
};

// CSV Export
document.getElementById('export-csv-btn').addEventListener('click', () => {
    if (myMembers.length === 0) return alert("No members to export.");
    
    let csvContent = "data:text/csv;charset=utf-8,FullName,TelegramUsername,WhatsApp,RegistrationDate,RegistrationTime\n";
    
    myMembers.forEach(m => {
        // Escape quotes
        const name = (m.fullName || '').replace(/"/g, '""');
        const tg = (m.telegramUsername || '').replace(/"/g, '""');
        const phone = (m.whatsappNumber || '').replace(/"/g, '""');
        
        csvContent += `"${name}","${tg}","${phone}","${m.registrationDate}","${m.registrationTime}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fx_leads_${globalAdminData.customUrl}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
