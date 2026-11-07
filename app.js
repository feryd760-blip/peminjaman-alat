// 1. INISIALISASI SUPABASE (Ganti dengan URL dan Key Anda)
const SUPABASE_URL = 'MASUKKAN_PROJECT_URL_ANDA';
const SUPABASE_KEY = 'MASUKKAN_ANON_KEY_ANDA';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variabel global untuk menampung data sementara di memori
let dataAlat = [];
let dataPeminjaman = [];

// ==========================================
// FUNGSI FETCH DATA DARI SUPABASE
// ==========================================
async function ambilDataAlat() {
    const { data, error } = await supabase.from('alat').select('*').order('id', { ascending: true });
    if (error) console.error('Error ambil alat:', error);
    else dataAlat = data;
}

async function ambilDataPeminjaman() {
    const { data, error } = await supabase.from('peminjaman').select('*').order('id', { ascending: false });
    if (error) console.error('Error ambil peminjaman:', error);
    else dataPeminjaman = data;
}

// ==========================================
// RENDER (Dipanggil setelah data diambil)
// ==========================================
async function refreshSemua() {
    await ambilDataAlat();
    await ambilDataPeminjaman();
    renderDashboard();
    renderPeminjaman();
    renderAlat();
}

function renderDashboard() {
    // ... (Logika hitung statistik tetap sama, menggunakan dataAlat dan dataPeminjaman)
    // Contoh: document.getElementById('statBelumKembali').innerText = dataPeminjaman.filter(p => p.status === 'Dipinjam').length;
    // Pastikan ID elemen di HTML sesuai.
}

// ==========================================
// FUNGSI SIMPAN (INSERT) KE SUPABASE
// ==========================================
document.getElementById('formAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const kode = document.getElementById('alatKode').value;
    const nama = document.getElementById('alatNama').value;
    const kondisi = document.getElementById('alatKondisi').value;
    
    const { error } = await supabase.from('alat').insert([
        { kode: kode, nama: nama, kondisi: kondisi, status: 'Tersedia' }
    ]);
    
    if (error) {
        alert('Gagal menyimpan alat: ' + error.message);
    } else {
        bootstrap.Modal.getInstance(document.getElementById('modalAlat')).hide();
        await refreshSemua(); // Ambil data terbaru dan render ulang
    }
});

document.getElementById('formPinjam').addEventListener('submit', async function(e) {
    e.preventDefault();
    // ... (Ambil nilai input)
    const { error } = await supabase.from('peminjaman').insert([{
        nama_peminjam: nama,
        status_peminjam: statusPeminjam,
        // ... isi kolom lainnya sesuai skema tabel
    }]);
    
    if (error) alert('Gagal meminjam: ' + error.message);
    else {
        // Update status alat menjadi 'Dipinjam'
        await supabase.from('alat').update({ status: 'Dipinjam' }).eq('id', alatId);
        bootstrap.Modal.getInstance(document.getElementById('modalPinjam')).hide();
        await refreshSemua();
    }
});

// ==========================================
// FUNGSI UPDATE (EDIT) DI SUPABASE
// ==========================================
document.getElementById('formEditAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editAlatId').value);
    const namaBaru = document.getElementById('editAlatNama').value;
    const kondisiBaru = document.getElementById('editAlatKondisi').value;
    const statusBaru = document.getElementById('editAlatStatus').value;
    
    const { error } = await supabase.from('alat')
        .update({ nama: namaBaru, kondisi: kondisiBaru, status: statusBaru })
        .eq('id', id);
        
    if (error) alert('Gagal update: ' + error.message);
    else {
        bootstrap.Modal.getInstance(document.getElementById('modalEditAlat')).hide();
        await refreshSemua();
    }
});

// ==========================================
// FUNGSI KEMBALIKAN (UPDATE STATUS)
// ==========================================
document.getElementById('formKembali').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('kembaliId').value);
    const kondisiBaru = document.getElementById('kembaliKondisi').value;
    const today = new Date().toISOString().split('T')[0];
    
    // Cari data peminjaman yang akan dikembalikan
    const pinjam = dataPeminjaman.find(p => p.id === id);
    
    // Update tabel peminjaman
    const { error: errPinjam } = await supabase.from('peminjaman')
        .update({ status: 'Kembali', tanggal_kembali: today, kondisi_kembali: kondisiBaru })
        .eq('id', id);
        
    if (errPinjam) return alert('Gagal update peminjaman: ' + errPinjam.message);
    
    // Update tabel alat (kembalikan status)
    const statusAlatBaru = (kondisiBaru === 'Baik') ? 'Tersedia' : 'Tidak Tersedia';
    const { error: errAlat } = await supabase.from('alat')
        .update({ kondisi: kondisiBaru, status: statusAlatBaru })
        .eq('nama', pinjam.nama_alat); // Asumsi pencocokan berdasarkan nama, idealnya pakai ID alat
        
    if (errAlat) alert('Gagal update alat: ' + errAlat.message);
    else {
        bootstrap.Modal.getInstance(document.getElementById('modalKembali')).hide();
        await refreshSemua();
    }
});

// Panggil refresh saat halaman pertama kali dimuat
document.addEventListener('DOMContentLoaded', refreshSemua);
}

// ==========================================
// 2. FUNGSI NAVIGASI
// ==========================================
function bukaMenu(menu, elemen) {
    document.querySelectorAll('.container-fluid > div').forEach(el => el.classList.add('d-none'));
    document.getElementById('halaman-' + menu).classList.remove('d-none');
    
    const judul = { 'dashboard': 'Dashboard', 'peminjaman': 'Peminjaman Alat', 'alat': 'Data Master Alat' };
    document.getElementById('judulHalaman').innerText = judul[menu];

    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    elemen.classList.add('active');

    if (menu === 'dashboard') renderDashboard();
    if (menu === 'peminjaman') renderPeminjaman();
    if (menu === 'alat') renderAlat();
}

// ==========================================
// 3. LOGIKA DASHBOARD
// ==========================================
function renderDashboard() {
    const belumKembali = dataPeminjaman.filter(p => p.status === 'Dipinjam').length;
    document.getElementById('statBelumKembali').innerText = belumKembali;

    const alatRusak = dataAlat.filter(a => a.kondisi === 'Rusak').length;
    document.getElementById('statAlatRusak').innerText = alatRusak;

    const alatHilang = dataAlat.filter(a => a.kondisi === 'Hilang').length;
    document.getElementById('statAlatHilang').innerText = alatHilang;
    
    const tbody = document.getElementById('tabelBelumKembali');
    tbody.innerHTML = '';
    const dipinjam = dataPeminjaman.filter(p => p.status === 'Dipinjam');
    
    if (dipinjam.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-success">Tidak ada alat yang dipinjam.</td></tr>`;
    } else {
        dipinjam.forEach((item, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.nama}</td>
                    <td><span class="badge bg-secondary">${item.statusPeminjam}</span></td>
                    <td><strong>${item.kodeAlat}</strong> - ${item.alat}</td>
                    <td>${item.tanggal}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="bukaModalKembali(${item.id})"><i class="fas fa-undo"></i> Kembalikan</button></td>
                </tr>
            `;
        });
    }
}

// ==========================================
// 4. LOGIKA PEMINJAMAN
// ==========================================
function renderPeminjaman() {
    const tbody = document.getElementById('tabelPeminjaman');
    tbody.innerHTML = '';
    
    if (dataPeminjaman.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Belum ada riwayat.</td></tr>`;
        return;
    }

    dataPeminjaman.forEach((item, index) => {
        let badgeClass = item.status === 'Dipinjam' ? 'bg-warning text-dark' : 'bg-success';
        let tglKembali = item.tanggalKembali ? item.tanggalKembali : '-';
        
        let displayStatus = item.statusPeminjam;
        if(item.statusPeminjam === 'Lainnya' && item.keterangan) {
            displayStatus += `<br><small class="text-muted">(${item.keterangan})</small>`;
        }

        let kondisiKembali = item.kondisiKembali || '-';
        let badgeKondisi = '';
        if (kondisiKembali === 'Baik') badgeKondisi = 'bg-success';
        if (kondisiKembali === 'Rusak') badgeKondisi = 'bg-warning text-dark';
        if (kondisiKembali === 'Hilang') badgeKondisi = 'bg-danger';
        
        let displayKondisi = kondisiKembali !== '-' ? `<span class="badge ${badgeKondisi}">${kondisiKembali}</span>` : '-';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.nama}</td>
                <td>${displayStatus}</td>
                <td><strong>${item.kodeAlat}</strong> - ${item.alat}</td>
                <td>${item.tanggal}</td>
                <td>${tglKembali}</td>
                <td>${displayKondisi}</td>
                <td><span class="badge ${badgeClass}">${item.status}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="hapusPeminjaman(${item.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `;
    });
}

function cekStatusLainnya() {
    const status = document.getElementById('pinjamStatus').value;
    const divKet = document.getElementById('divKeterangan');
    const inputKet = document.getElementById('pinjamKeterangan');
    
    if (status === 'Lainnya') {
        divKet.classList.remove('d-none');
        inputKet.required = true;
    } else {
        divKet.classList.add('d-none');
        inputKet.required = false;
        inputKet.value = '';
    }
}

function bukaModalPinjam() {
    document.getElementById('formPinjam').reset();
    document.getElementById('divKeterangan').classList.add('d-none'); 
    
    const select = document.getElementById('pinjamAlat');
    select.innerHTML = '<option value="">-- Pilih Alat --</option>';
    
    const alatTersedia = dataAlat.filter(a => a.status === 'Tersedia' && a.kondisi === 'Baik');
    
    if (alatTersedia.length === 0) {
        alert("Tidak ada alat dengan kondisi Baik yang siap dipinjam!");
        return;
    }

    alatTersedia.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.kode} - ${a.nama}</option>`;
    });
    new bootstrap.Modal(document.getElementById('modalPinjam')).show();
}

document.getElementById('formPinjam').addEventListener('submit', function(e) {
    e.preventDefault();
    const nama = document.getElementById('pinjamNama').value;
    const statusPeminjam = document.getElementById('pinjamStatus').value;
    const keterangan = document.getElementById('pinjamKeterangan').value;
    const alatId = parseInt(document.getElementById('pinjamAlat').value);
    const tanggal = document.getElementById('pinjamTanggal').value;
    
    const alat = dataAlat.find(a => a.id === alatId);
    
    dataPeminjaman.push({
        id: Date.now(),
        nama: nama,
        statusPeminjam: statusPeminjam,
        keterangan: keterangan,
        kodeAlat: alat.kode,
        alat: alat.nama,
        tanggal: tanggal,
        tanggalKembali: '',
        kondisiKembali: '',
        status: 'Dipinjam'
    });
    
    alat.status = 'Dipinjam'; 
    
    localStorage.setItem('dataPeminjaman', JSON.stringify(dataPeminjaman));
    localStorage.setItem('dataAlat', JSON.stringify(dataAlat));
    
    bootstrap.Modal.getInstance(document.getElementById('modalPinjam')).hide();
    renderPeminjaman();
    renderDashboard();
});

function bukaModalKembali(id) {
    document.getElementById('formKembali').reset();
    document.getElementById('kembaliId').value = id;
    
    const pinjam = dataPeminjaman.find(p => p.id === id);
    const alat = dataAlat.find(a => a.nama === pinjam.alat);
    
    if (alat) {
        document.getElementById('kembaliKondisi').value = alat.kondisi || 'Baik';
    }

    new bootstrap.Modal(document.getElementById('modalKembali')).show();
}

document.getElementById('formKembali').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('kembaliId').value);
    const kondisiBaru = document.getElementById('kembaliKondisi').value;
    
    const pinjam = dataPeminjaman.find(p => p.id === id);
    
    pinjam.status = 'Kembali'; 
    const today = new Date();
    pinjam.tanggalKembali = today.toISOString().split('T')[0]; 
    pinjam.kondisiKembali = kondisiBaru;
    
    const alat = dataAlat.find(a => a.nama === pinjam.alat);
    if (alat) {
        alat.kondisi = kondisiBaru; 
        if(kondisiBaru === 'Baik') {
            alat.status = 'Tersedia'; 
        } else {
            alat.status = 'Tidak Tersedia';
        }
    }

    localStorage.setItem('dataPeminjaman', JSON.stringify(dataPeminjaman));
    localStorage.setItem('dataAlat', JSON.stringify(dataAlat));
    
    bootstrap.Modal.getInstance(document.getElementById('modalKembali')).hide();
    renderDashboard();
    renderPeminjaman();
    renderAlat();
});

function hapusPeminjaman(id) {
    if(confirm('Hapus riwayat ini?')) {
        dataPeminjaman = dataPeminjaman.filter(p => p.id !== id);
        localStorage.setItem('dataPeminjaman', JSON.stringify(dataPeminjaman));
        renderPeminjaman();
        renderDashboard();
    }
}

// ==========================================
// 5. LOGIKA DATA ALAT & EDIT
// ==========================================
function renderAlat() {
    const tbody = document.getElementById('tabelAlat');
    tbody.innerHTML = '';
    
    dataAlat.forEach((item, index) => {
        let badgeStatus = item.status === 'Tersedia' ? 'bg-success' : 'bg-danger';
        
        let badgeKondisi = 'bg-success'; 
        if(item.kondisi === 'Rusak') badgeKondisi = 'bg-warning text-dark';
        if(item.kondisi === 'Hilang') badgeKondisi = 'bg-danger';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${item.kode}</strong></td>
                <td>${item.nama}</td>
                <td><span class="badge ${badgeKondisi}">${item.kondisi || 'Baik'}</span></td>
                <td><span class="badge ${badgeStatus}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning text-white me-1" onclick="bukaModalEditAlat(${item.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="hapusAlat(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function bukaModalAlat() {
    document.getElementById('formAlat').reset();
    new bootstrap.Modal(document.getElementById('modalAlat')).show();
}

document.getElementById('formAlat').addEventListener('submit', function(e) {
    e.preventDefault();
    const kode = document.getElementById('alatKode').value;
    const nama = document.getElementById('alatNama').value;
    const kondisi = document.getElementById('alatKondisi').value;
    
    dataAlat.push({ id: Date.now(), kode: kode, nama: nama, kondisi: kondisi, status: 'Tersedia' });
    localStorage.setItem('dataAlat', JSON.stringify(dataAlat));
    
    bootstrap.Modal.getInstance(document.getElementById('modalAlat')).hide();
    renderAlat();
    renderDashboard();
});

function bukaModalEditAlat(id) {
    const alat = dataAlat.find(a => a.id === id);
    if(alat) {
        document.getElementById('editAlatId').value = alat.id;
        document.getElementById('editAlatKode').value = alat.kode;
        document.getElementById('editAlatNama').value = alat.nama;
        document.getElementById('editAlatKondisi').value = alat.kondisi;
        document.getElementById('editAlatStatus').value = alat.status;
        
        new bootstrap.Modal(document.getElementById('modalEditAlat')).show();
    }
}

document.getElementById('formEditAlat').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editAlatId').value);
    const namaBaru = document.getElementById('editAlatNama').value;
    const kondisiBaru = document.getElementById('editAlatKondisi').value;
    const statusBaru = document.getElementById('editAlatStatus').value;
    
    const alat = dataAlat.find(a => a.id === id);
    if(alat) {
        alat.nama = namaBaru;
        alat.kondisi = kondisiBaru;
        alat.status = statusBaru;
        
        localStorage.setItem('dataAlat', JSON.stringify(dataAlat));
        bootstrap.Modal.getInstance(document.getElementById('modalEditAlat')).hide();
        
        renderAlat();
        renderDashboard();
    }
});

function hapusAlat(id) {
    if(confirm('Hapus alat ini?')) {
        dataAlat = dataAlat.filter(a => a.id !== id);
        localStorage.setItem('dataAlat', JSON.stringify(dataAlat));
        renderAlat();
        renderDashboard();
    }
}

// ==========================================
// 6. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
});
