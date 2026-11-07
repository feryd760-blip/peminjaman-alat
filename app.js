// ==========================================
// 1. INISIALISASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://yoxumvjdfpaecvbtzcnv.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_G9ZZHq3bSgq1EGhTPUTBg_vDjknI64'; // Pastikan kutip satu di akhir
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variabel penampung data sementara
let dataPeminjaman = [];
let dataAlat = [];

// ==========================================
// 2. FUNGSI NAVIGASI (PASTI JALAN)
// ==========================================
window.bukaMenu = function(menu, elemen) {
    document.querySelectorAll('.container-fluid > div').forEach(el => el.classList.add('d-none'));
    document.getElementById('halaman-' + menu).classList.remove('d-none');
    
    const judul = { 'dashboard': 'Dashboard', 'peminjaman': 'Peminjaman Alat', 'alat': 'Data Master Alat' };
    document.getElementById('judulHalaman').innerText = judul[menu];

    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    elemen.classList.add('active');
}

// ==========================================
// 2. FUNGSI AMBIL DATA DARI DATABASE
// ==========================================
async function refreshData() {
    // Ambil Data Alat
    const { data: alat, error: errAlat } = await supabaseClient.from('alat').select('*').order('id', { ascending: true });
    if (!errAlat) dataAlat = alat;

    // Ambil Data Peminjaman
    const { data: pinjam, error: errPinjam } = await supabaseClient.from('peminjaman').select('*').order('id', { ascending: false });
    if (!errPinjam) dataPeminjaman = pinjam;

    // Render ulang semua tabel
    renderDashboard();
    renderPeminjaman();
    renderAlat();
}

// ==========================================
// 3. FUNGSI NAVIGASI
// ==========================================
function bukaMenu(menu, elemen) {
    document.querySelectorAll('.container-fluid > div').forEach(el => el.classList.add('d-none'));
    document.getElementById('halaman-' + menu).classList.remove('d-none');
    
    const judul = { 'dashboard': 'Dashboard', 'peminjaman': 'Peminjaman Alat', 'alat': 'Data Master Alat' };
    document.getElementById('judulHalaman').innerText = judul[menu];

    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    elemen.classList.add('active');
}

// ==========================================
// 4. LOGIKA DASHBOARD
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
                    <td>${item.nama_peminjam}</td>
                    <td><span class="badge bg-secondary">${item.status_peminjam}</span></td>
                    <td><strong>${item.kode_alat}</strong> - ${item.nama_alat}</td>
                    <td>${item.tanggal}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="bukaModalKembali(${item.id})"><i class="fas fa-undo"></i> Kembalikan</button></td>
                </tr>
            `;
        });
    }
}

// ==========================================
// 5. LOGIKA PEMINJAMAN
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
        let tglKembali = item.tanggal_kembali ? item.tanggal_kembali : '-';
        
        let displayStatus = item.status_peminjam;
        if(item.status_peminjam === 'Lainnya' && item.keterangan) {
            displayStatus += `<br><small class="text-muted">(${item.keterangan})</small>`;
        }

        let kondisiKembali = item.kondisi_kembali || '-';
        let badgeKondisi = '';
        if (kondisiKembali === 'Baik') badgeKondisi = 'bg-success';
        if (kondisiKembali === 'Rusak') badgeKondisi = 'bg-warning text-dark';
        if (kondisiKembali === 'Hilang') badgeKondisi = 'bg-danger';
        
        let displayKondisi = kondisiKembali !== '-' ? `<span class="badge ${badgeKondisi}">${kondisiKembali}</span>` : '-';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.nama_peminjam}</td>
                <td>${displayStatus}</td>
                <td><strong>${item.kode_alat}</strong> - ${item.nama_alat}</td>
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

// SIMPAN PEMINJAMAN KE SUPABASE
document.getElementById('formPinjam').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nama = document.getElementById('pinjamNama').value;
    const statusPeminjam = document.getElementById('pinjamStatus').value;
    const keterangan = document.getElementById('pinjamKeterangan').value;
    const alatId = parseInt(document.getElementById('pinjamAlat').value);
    const tanggal = document.getElementById('pinjamTanggal').value;
    
    const alat = dataAlat.find(a => a.id === alatId);
    
    // 1. Insert ke tabel peminjaman
    const { error: errPinjam } = await supabaseClient.from('peminjaman').insert([{
        nama_peminjam: nama,
        status_peminjam: statusPeminjam,
        keterangan: keterangan,
        kode_alat: alat.kode,
        nama_alat: alat.nama,
        tanggal: tanggal,
        status: 'Dipinjam'
    }]);
    
    if (errPinjam) {
        return alert("Gagal meminjam: " + errPinjam.message);
    }

    // 2. Update status alat menjadi Dipinjam
    await supabaseClient.from('alat').update({ status: 'Dipinjam' }).eq('id', alatId);
    
    bootstrap.Modal.getInstance(document.getElementById('modalPinjam')).hide();
    refreshData();
});

// ==========================================
// 6. LOGIKA PENGEMBALIAN ALAT
// ==========================================
function bukaModalKembali(id) {
    document.getElementById('formKembali').reset();
    document.getElementById('kembaliId').value = id;
    
    const pinjam = dataPeminjaman.find(p => p.id === id);
    const alat = dataAlat.find(a => a.nama === pinjam.nama_alat);
    
    if (alat) {
        document.getElementById('kembaliKondisi').value = alat.kondisi || 'Baik';
    }

    new bootstrap.Modal(document.getElementById('modalKembali')).show();
}

// UPDATE PENGEMBALIAN KE SUPABASE
document.getElementById('formKembali').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('kembaliId').value);
    const kondisiBaru = document.getElementById('kembaliKondisi').value;
    const today = new Date().toISOString().split('T')[0];
    
    const pinjam = dataPeminjaman.find(p => p.id === id);
    
    // 1. Update tabel peminjaman (status jadi Kembali)
    const { error: errUpdate } = await supabaseClient.from('peminjaman').update({
        status: 'Kembali',
        tanggal_kembali: today,
        kondisi_kembali: kondisiBaru
    }).eq('id', id);
    
    if (errUpdate) return alert("Gagal update peminjaman: " + errUpdate.message);

    // 2. Update master alat (kondisi & statusnya)
    const statusAlatBaru = (kondisiBaru === 'Baik') ? 'Tersedia' : 'Tidak Tersedia';
    const { error: errAlat } = await supabaseClient.from('alat').update({
        kondisi: kondisiBaru,
        status: statusAlatBaru
    }).eq('kode', pinjam.kode_alat); // Disarankan pakai kode unik agar akurat
    
    if (errAlat) alert("Gagal update alat: " + errAlat.message);
    
    bootstrap.Modal.getInstance(document.getElementById('modalKembali')).hide();
    refreshData();
});

async function hapusPeminjaman(id) {
    if(confirm('Hapus riwayat ini?')) {
        await supabaseClient.from('peminjaman').delete().eq('id', id);
        refreshData();
    }
}

// ==========================================
// 7. LOGIKA DATA ALAT (INSERT & EDIT)
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

document.getElementById('formAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const kode = document.getElementById('alatKode').value;
    const nama = document.getElementById('alatNama').value;
    const kondisi = document.getElementById('alatKondisi').value;
    
    const { error } = await supabaseClient.from('alat').insert([{
        kode: kode, nama: nama, kondisi: kondisi, status: 'Tersedia'
    }]);
    
    if (error) alert("Gagal menambah alat: " + error.message);
    else {
        bootstrap.Modal.getInstance(document.getElementById('modalAlat')).hide();
        refreshData();
    }
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

document.getElementById('formEditAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editAlatId').value);
    const namaBaru = document.getElementById('editAlatNama').value;
    const kondisiBaru = document.getElementById('editAlatKondisi').value;
    const statusBaru = document.getElementById('editAlatStatus').value;
    
    const { error } = await supabaseClient.from('alat').update({
        nama: namaBaru, kondisi: kondisiBaru, status: statusBaru
    }).eq('id', id);
    
    if (error) alert("Gagal update alat: " + error.message);
    else {
        bootstrap.Modal.getInstance(document.getElementById('modalEditAlat')).hide();
        refreshData();
    }
});

async function hapusAlat(id) {
    if(confirm('Hapus alat ini?')) {
        await supabaseClient.from('alat').delete().eq('id', id);
        refreshData();
    }
}

// ==========================================
// 8. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    refreshData(); // Ambil data dari Supabase saat aplikasi dibuka
});
