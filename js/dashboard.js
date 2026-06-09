import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// KREDENSIAL FIREBASE CONFIG (PLACEHOLDER)
// ==========================================
// Salin konfigurasi ini dari Firebase Console Anda:
// Project Settings -> General -> Web apps -> SDK setup and configuration
const firebaseConfig = {
    apiKey: "PASTE_API_KEY_ANDA_DI_SINI",
    authDomain: "PASTE_PROJECT_ID_ANDA.firebaseapp.com",
    databaseURL: "https://PASTE_PROJECT_ID_ANDA-default-rtdb.firebaseio.com",
    projectId: "PASTE_PROJECT_ID_ANDA",
    storageBucket: "PASTE_PROJECT_ID_ANDA.appspot.com",
    messagingSenderId: "PASTE_MESSAGING_SENDER_ID_ANDA",
    appId: "PASTE_APP_ID_ANDA"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// REFERENSI ELEMEN DOM HTML
// ==========================================
const mainBulbIcon = document.getElementById('main-bulb-icon');
const mainStatusText = document.getElementById('main-status-text');
const ldrDisplay = document.getElementById('ldr-display');
const usageHoursDisplay = document.getElementById('usage-hours');
const usagePowerDisplay = document.getElementById('usage-power');

const toggles = {
    teras: document.getElementById('toggle-teras'),
    ruangTamu: document.getElementById('toggle-ruang-tamu'),
    kamarTidur: document.getElementById('toggle-kamar-tidur'),
    kamarMandi: document.getElementById('toggle-kamar-mandi')
};

// Flag bantuan untuk mencegah looping event saat UI menerima pembaruan dari database
let isUpdatingFromFirebase = false;

// ==========================================
// 1. SINKRONISASI DATA REAL-TIME (READ)
// ==========================================

// [Widget 1] Mendengarkan Status Lampu Utama (Global)
const globalStatusRef = ref(db, 'lamps/global_status');
onValue(globalStatusRef, (snapshot) => {
    const isLampuMenyala = snapshot.val();
    
    if (isLampuMenyala === true) {
        mainStatusText.innerText = "MENYALA";
        mainBulbIcon.classList.remove('status-off');
        mainBulbIcon.classList.add('status-on'); // Berubah warna kuning di CSS
    } else {
        mainStatusText.innerText = "MATI";
        mainBulbIcon.classList.remove('status-on');
        mainBulbIcon.classList.add('status-off'); // Berubah warna abu-abu di CSS
    }
});

// [Widget 2] Mendengarkan Angka Indikator Intensitas Cahaya dari Sensor LDR
const ldrRef = ref(db, 'sensors/ldr');
onValue(ldrRef, (snapshot) => {
    const ldrValue = snapshot.val();
    if (ldrValue !== null) {
        ldrDisplay.innerText = ldrValue;
    }
});

// [Widget 3] Mendengarkan Estimasi Penggunaan & Konsumsi Listrik
// Node ini bisa dihitung akumulasinya secara periodik oleh NodeMCU atau cloud function
const usageRef = ref(db, 'usage');
onValue(usageRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        if (data.hours !== undefined) {
            usageHoursDisplay.innerText = `${data.hours} Jam`;
        }
        if (data.power !== undefined) {
            usagePowerDisplay.innerText = `${data.power} Wh`; // Estimasi konsumsi daya lampu DC 12V
        }
    }
});

// Sinkronisasi Keadaan Tombol Toggle Override dari Firebase ke Interface Web
const manualOverrideRef = ref(db, 'lamps/manual_override');
onValue(manualOverrideRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        isUpdatingFromFirebase = true; // Aktifkan flag pencegah feedback loop
        
        toggles.teras.checked = data.teras || false;
        toggles.ruangTamu.checked = data.ruang_tamu || false;
        toggles.kamarTidur.checked = data.kamar_tidur || false;
        toggles.kamarMandi.checked = data.kamar_mandi || false;
        
        isUpdatingFromFirebase = false; // Nonaktifkan kembali setelah UI sinkron
    }
});

// ==========================================
// 2. KENDALI TOMBOL OVERRIDE MANUAL (WRITE)
// ==========================================

// Fungsi pembantu untuk mengirim perintah toggle ke Firebase Realtime Database
function sendToggleState(roomPath, isChecked) {
    // Jalankan pengiriman hanya jika perubahan dipicu oleh klik user (bukan efek sinkronisasi otomatis)
    if (!isUpdatingFromFirebase) {
        set(ref(db, `lamps/manual_override/${roomPath}`), isChecked)
            .then(() => {
                console.log(`Status lampu ${roomPath} berhasil diperbarui: ${isChecked}`);
            })
            .catch((error) => {
                console.error(`Gagal memperbarui database untuk lampu ${roomPath}:`, error);
            });
    }
}

// Event Listeners untuk mendeteksi interaksi klik pada masing-masing toggle di dashboard
toggles.teras.addEventListener('change', (e) => sendToggleState('teras', e.target.checked));
toggles.ruangTamu.addEventListener('change', (e) => sendToggleState('ruang_tamu', e.target.checked));
toggles.kamarTidur.addEventListener('change', (e) => sendToggleState('kamar_tidur', e.target.checked));
toggles.kamarMandi.addEventListener('change', (e) => sendToggleState('kamar_mandi', e.target.checked));