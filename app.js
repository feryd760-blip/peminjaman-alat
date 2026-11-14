// ==========================================
// 1. INISIALISASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://yoxumvjdfpaecvbtzcnv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHVtdmpkZnBhZWN2YnR6Y252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDQ5MzgsImV4cCI6MjEwOTYyMDkzOH0.jtpdBrKmWuwkVVlg_kr_4-7YexSD75xbVD9kCQPFNoc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let dataPeminjaman = [];
let dataAlat = [];

// ==========================================
// 2. NAVIGASI
// ==========================================
window.bukaMenu = function(menu, elemen) {
    document.querySelectorAll('.container-fluid > div').forEach(el => el.classList.add('d-none'));
    document.getElementById('halaman-' + menu).classList.remove('d-none');
    
    const judul = { 'dashboard': 'Dashboard', 'peminjaman': 'Peminjaman Alat', 'alat': 'Data Master Alat', 'laporan': 'Laporan' };
    document.getElementById('judulHalaman').innerText = judul[menu];

    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    elemen.classList.add('active');
}

// ==========================================
// 3. AMBIL DATA
// ==========================================
async function refreshData() {
    if (!supabaseClient) return;
    try {
        const { data: alat, error: errAlat } = await supabaseClient.from('alat').select('*');
        if (errAlat) throw errAlat;
        dataAlat = alat || [];

        const { data: pinjam, error: errPinjam } = await supabaseClient.from('peminjaman').select('*').order('id', { ascending: false });
        if (errPinjam) throw errPinjam;
        dataPeminjaman = pinjam || [];

        renderDashboard();
        renderPeminjaman();
        renderAlat();
    } catch (error) {
        console.error("Gagal:", error.message);
        alert("Error: " + error.message);
    }
}

// ==========================================
// 4. RENDER DASHBOARD
// ==========================================
function renderDashboard() {
    document.getElementById('statBelumKembali').innerText = dataPeminjaman.filter(p => p.status === 'Dipinjam').length;
    document.getElementById('statAlatRusak').innerText = dataAlat.filter(a => a.kondisi === 'Rusak').length;
    document.getElementById('statAlatHilang').innerText = dataAlat.filter(a => a.kondisi === 'Hilang').length;
    
    const keyword = document.getElementById('searchDashboard').value.toLowerCase();
    const dipinjamCocok = dataPeminjaman.filter(p => {
        if (p.status !== 'Dipinjam') return false;
        return p.nama_peminjam.toLowerCase().includes(keyword) || p.nama_alat.toLowerCase().includes(keyword);
    });

    const dataFab = dipinjamCocok.filter(p => p.alokasi === 'Fabrikasi');
    const dataInst = dipinjamCocok.filter(p => p.alokasi === 'Instalasi');

    // Render Fabrikasi
    const tbodyFab = document.getElementById('tabelFabrikasi');
    tbodyFab.innerHTML = dataFab.length === 0 ? `<tr><td colspan="6" class="text-center">Kosong</td></tr>` : '';
    dataFab.forEach((item, index) => {
        tbodyFab.innerHTML += `<tr><td>${index+1}</td><td>${item.nama_peminjam}</td><td>${item.status_peminjam}</td><td>${item.kode_alat} - ${item.nama_alat}</td><td>${item.tanggal}</td><td><button class="btn btn-sm btn-danger" onclick="bukaModalKembali(${item.id})">Kembalikan</button></td></tr>`;
    });

    // Render Instalasi
    const tbodyInst = document.getElementById('tabelInstalasi');
    tbodyInst.innerHTML = dataInst.length === 0 ? `<tr><td colspan="7" class="text-center">Kosong</td></tr>` : '';
    dataInst.forEach((item, index) => {
        tbodyInst.innerHTML += `<tr><td>${index+1}</td><td>${item.nama_peminjam}</td><td>${item.status_peminjam}</td><td>${item.kode_alat} - ${item.nama_alat}</td><td>${item.ket_instalasi || '-'}</td><td>${item.tanggal}</td><td><button class="btn btn-sm btn-danger" onclick="bukaModalKembali(${item.id})">Kembalikan</button></td></tr>`;
    });
}

function cariDashboard() { renderDashboard(); }
function gantiTab(nama) { /* Bootstrap tab handles UI, function for compatibility */ }

// ==========================================
// 5. RENDER PEMINJAMAN
// ==========================================
function renderPeminjaman() {
    const tbody = document.getElementById('tabelPeminjaman');
    tbody.innerHTML = dataPeminjaman.length === 0 ? `<tr><td colspan="11" class="text-center">Belum ada riwayat.</td></tr>` : '';
    
    dataPeminjaman.forEach((item, index) => {
        let badge = item.status === 'Dipinjam' ? 'bg-warning text-dark' : 'bg-success';
        let tglKembali = item.tanggal_kembali ? item.tanggal_kembali : '-';
        let kondisi = item.kondisi_kembali ? item.kondisi_kembali : '-';
        let displayStatus = item.status_peminjam === 'Lainnya' ? `Lainnya (${item.keterangan})` : item.status_peminjam;

        tbody.innerHTML += `
            <tr>
                <td>${index+1}</td><td>${item.nama_peminjam}</td><td>${displayStatus}</td>
                <td>${item.kode_alat} - ${item.nama_alat}</td><td>${item.alokasi}</td>
                <td>${item.ket_instalasi || '-'}</td><td>${item.tanggal}</td><td>${tglKembali}</td>
                <td>${kondisi}</td><td><span class="badge ${badge}">${item.status}</span></td>
                <td><button class="btn btn-sm btn-danger" onclick="hapusPeminjaman(${item.id})"><i class="fas fa-trash"></i></button></td>
            </tr>`;
    });
}

// ==========================================
// 6. FORM PEMINJAMAN & LOGIKA
// ==========================================
function cekStatusLainnya() {
    const isLainnya = document.getElementById('pinjamStatus').value === 'Lainnya';
    document.getElementById('divKeterangan').classList.toggle('d-none', !isLainnya);
    document.getElementById('pinjamKeterangan').required = isLainnya;
}

function cekAlokasi() {
    const isInstalasi = document.getElementById('pinjamAlokasi').value === 'Instalasi';
    document.getElementById('divKetInstalasi').classList.toggle('d-none', !isInstalasi);
    document.getElementById('pinjamKetInstalasi').required = isInstalasi;
}

function bukaModalPinjam() {
    document.getElementById('formPinjam').reset();
    document.getElementById('divKeterangan').classList.add('d-none');
    document.getElementById('divKetInstalasi').classList.add('d-none');
    
    const select = document.getElementById('pinjamAlat');
    select.innerHTML = '<option value="">-- Pilih Alat --</option>';
    const alatTersedia = dataAlat.filter(a => a.status === 'Tersedia' && a.kondisi === 'Baik');
    if (alatTersedia.length === 0) return alert("Tidak ada alat tersedia!");
    
    alatTersedia.forEach(a => select.innerHTML += `<option value="${a.id}">${a.kode} - ${a.nama}</option>`);
    new bootstrap.Modal(document.getElementById('modalPinjam')).show();
}

document.getElementById('formPinjam').addEventListener('submit', async function(e) {
    e.preventDefault();
    const alatId = parseInt(document.getElementById('pinjamAlat').value);
    const alat = dataAlat.find(a => a.id === alatId);
    
    const { error } = await supabaseClient.from('peminjaman').insert([{
        nama_peminjam: document.getElementById('pinjamNama').value,
        status_peminjam: document.getElementById('pinjamStatus').value,
        keterangan: document.getElementById('pinjamKeterangan').value,
        kode_alat: alat.kode, nama_alat: alat.nama,
        alokasi: document.getElementById('pinjamAlokasi').value,
        ket_instalasi: document.getElementById('pinjamKetInstalasi').value,
        tanggal: document.getElementById('pinjamTanggal').value,
        status: 'Dipinjam'
    }]);

    if (error) return alert("Gagal: " + error.message);
    await supabaseClient.from('alat').update({ status: 'Dipinjam' }).eq('id', alatId);
    
    bootstrap.Modal.getInstance(document.getElementById('modalPinjam')).hide();
    refreshData();
});

// ==========================================
// 7. PENGEMBALIAN & HAPUS
// ==========================================
function bukaModalKembali(id) {
    document.getElementById('formKembali').reset();
    document.getElementById('kembaliId').value = id;
    new bootstrap.Modal(document.getElementById('modalKembali')).show();
}

document.getElementById('formKembali').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('kembaliId').value);
    const kondisi = document.getElementById('kembaliKondisi').value;
    const pinjam = dataPeminjaman.find(p => p.id === id);
    
    await supabaseClient.from('peminjaman').update({
        status: 'Kembali', tanggal_kembali: new Date().toISOString().split('T')[0], kondisi_kembali: kondisi
    }).eq('id', id);

    await supabaseClient.from('alat').update({
        kondisi: kondisi, status: (kondisi === 'Baik') ? 'Tersedia' : 'Tidak Tersedia'
    }).eq('kode', pinjam.kode_alat);
    
    bootstrap.Modal.getInstance(document.getElementById('modalKembali')).hide();
    refreshData();
});

async function hapusPeminjaman(id) {
    if(confirm('Hapus?')) {
        await supabaseClient.from('peminjaman').delete().eq('id', id);
        refreshData();
    }
}

// ==========================================
// 8. DATA ALAT & EDIT
// ==========================================
function renderAlat() {
    const tbody = document.getElementById('tabelAlat');
    tbody.innerHTML = '';
    dataAlat.forEach((item, index) => {
        let badgeStatus = item.status === 'Tersedia' ? 'bg-success' : 'bg-danger';
        let badgeKondisi = item.kondisi === 'Rusak' ? 'bg-warning text-dark' : (item.kondisi === 'Hilang' ? 'bg-danger' : 'bg-success');

        tbody.innerHTML += `
            <tr>
                <td>${index+1}</td><td>${item.kode}</td><td>${item.nama}</td>
                <td><span class="badge ${badgeKondisi}">${item.kondisi}</span></td>
                <td><span class="badge ${badgeStatus}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning text-white" onclick="bukaEditAlat(${item.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="hapusAlat(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

function bukaModalAlat() {
    document.getElementById('formAlat').reset();
    new bootstrap.Modal(document.getElementById('modalAlat')).show();
}

document.getElementById('formAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const { error } = await supabaseClient.from('alat').insert([{
        kode: document.getElementById('alatKode').value,
        nama: document.getElementById('alatNama').value,
        kondisi: document.getElementById('alatKondisi').value,
        status: 'Tersedia'
    }]);
    if (!error) {
        bootstrap.Modal.getInstance(document.getElementById('modalAlat')).hide();
        refreshData();
    } else alert(error.message);
});

function bukaEditAlat(id) {
    const alat = dataAlat.find(a => a.id === id);
    document.getElementById('editAlatId').value = alat.id;
    document.getElementById('editAlatKode').value = alat.kode;
    document.getElementById('editAlatNama').value = alat.nama;
    document.getElementById('editAlatKondisi').value = alat.kondisi;
    document.getElementById('editAlatStatus').value = alat.status;
    new bootstrap.Modal(document.getElementById('modalEditAlat')).show();
}

document.getElementById('formEditAlat').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('editAlatId').value;
    await supabaseClient.from('alat').update({
        nama: document.getElementById('editAlatNama').value,
        kondisi: document.getElementById('editAlatKondisi').value,
        status: document.getElementById('editAlatStatus').value
    }).eq('id', id);
    bootstrap.Modal.getInstance(document.getElementById('modalEditAlat')).hide();
    refreshData();
});

async function hapusAlat(id) {
    if(confirm('Hapus alat?')) {
        await supabaseClient.from('alat').delete().eq('id', id);
        refreshData();
    }
}

// ==========================================
// 9. LAPORAN (DOWNLOAD EXCEL)
// ==========================================
function downloadExcel() {
    if (dataPeminjaman.length === 0) return alert("Tidak ada data!");
    let csv = "No;Nama;Status;Alokasi;Ket Instalasi;Alat;Tgl Pinjam;Tgl Kembali;Kondisi;Status\n";
    dataPeminjaman.forEach((item, i) => {
        let nama = (item.nama_peminjam||'').replace(/;/g,' ');
        let ketI = (item.ket_instalasi||'').replace(/;/g,' ');
        csv += `${i+1};${nama};${item.status_peminjam};${item.alokasi};${ketI};${item.nama_alat};${item.tanggal};${item.tanggal_kembali||'-'};${item.kondisi_kembali||'-'};${item.status}\n`;
    });
    const blob = new Blob(["\u
