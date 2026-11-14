// ==========================================
// 1. INISIALISASI SUPABASE
// ==========================================
const SUPABASE_URL = 'https://yoxumvjdfpaecvbtzcnv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlveHVtdmpkZnBhZWN2YnR6Y252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNDQ5MzgsImV4cCI6MjEwOTYyMDkzOH0.jtpdBrKmWuwkVVlg_kr_4-7YexSD75xbVD9kCQPFNoc';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


let dataPeminjaman = [];
let dataAlat = [];
let tabAktif = 'Fabrikasi'; 

// ==========================================
// 2. FUNGSI NAVIGASI
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
// 3. FUNGSI AMBIL DATA DARI DATABASE
// ==========================================
async function refreshData() {
    if (!supabaseClient) return;
    try {
        // 1. Ambil Alat (cara biasa)
        const { data: alat, error: errAlat } = await supabaseClient.from('alat').select('*');
        if (errAlat) throw errAlat;
        dataAlat = alat || [];

        // 2. Ambil Peminjaman (pakai fungsi RPC untuk bypass cache)
        const { data: pinjam, error: errPinjam } = await supabaseClient.rpc('ambil_semua_peminjaman');
        if (errPinjam) throw errPinjam;
        dataPeminjaman = pinjam || [];

        // Render ke layar
        renderDashboard();
        renderPeminjaman();
        renderAlat();
    } catch (error) {
        console.error("Gagal:", error.message);
        alert("Error Database: " + error.message);
    }
}
// ==========================================
// 4. LOGIKA DASHBOARD & TAB
// ==========================================
function renderDashboard() {
    const belumKembali = dataPeminjaman.filter(p => p.status === 'Dipinjam').length;
    const statBK = document.getElementById('statBelumKembali');
    if (statBK) statBK.innerText = belumKembali;

    const alatRusak = dataAlat.filter(a => a.kondisi === 'Rusak').length;
    const statRusak = document.getElementById('statAlatRusak');
    if (statRusak) statRusak.innerText = alatRusak;

    const alatHilang = dataAlat.filter(a => a.kondisi === 'Hilang').length;
    const statHilang = document.getElementById('statAlatHilang');
    if (statHilang) statHilang.innerText = alatHilang;
    
    const searchInput = document.getElementById('searchDashboard');
    const keyword = searchInput ? searchInput.value.toLowerCase() : '';

    const dipinjamCocok = dataPeminjaman.filter(p => {
        if (p.status !== 'Dipinjam') return false;
        return p.nama_peminjam.toLowerCase().includes(keyword) || 
               p.nama_alat.toLowerCase().includes(keyword) ||
               p.kode_alat.toLowerCase().includes(keyword);
    });

    const dataFabrikasi = dipinjamCocok.filter(p => p.alokasi === 'Fabrikasi');
    const dataInstalasi = dipinjamCocok.filter(p => p.alokasi === 'Instalasi');

    const tbodyFab = document.getElementById('tabelFabrikasi');
    if (tbodyFab) {
        tbodyFab.innerHTML = '';
        if (dataFabrikasi.length === 0) {
            tbodyFab.innerHTML = `<tr><td colspan="6" class="text-center text-success">Tidak ada data Fabrikasi yang belum kembali.</td></tr>`;
        } else {
            dataFabrikasi.forEach((item, index) => {
                tbodyFab.innerHTML += `
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

    const tbodyInst = document.getElementById('tabelInstalasi');
    if (tbodyInst) {
        tbodyInst.innerHTML = '';
        if (dataInstalasi.length === 0) {
            tbodyInst.innerHTML = `<tr><td colspan="7" class="text-center text-success">Tidak ada data Instalasi yang belum kembali.</td></tr>`;
        } else {
            dataInstalasi.forEach((item, index) => {
                tbodyInst.innerHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.nama_peminjam}</td>
                        <td><span class="badge bg-secondary">${item.status_peminjam}</span></td>
                        <td><strong>${item.kode_alat}</strong> - ${item.nama_alat}</td>
                        <td>${item.ket_instalasi || '-'}</td>
                        <td>${item.tanggal}</td>
                        <td><button class="btn btn-sm btn-danger" onclick="bukaModalKembali(${item.id})"><i class="fas fa-undo"></i> Kembalikan</button></td>
                    </tr>
                `;
            });
        }
    }
}

function cariDashboard() {
    renderDashboard();
}

function gantiTab(namaTab) {
    tabAktif = namaTab;
}

// ==========================================
// 5. LOGIKA PEMINJAMAN
// ==========================================
function renderPeminjaman() {
    const tbody = document.getElementById('tabelPeminjaman');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (dataPeminjaman.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">Belum ada riwayat.</td></tr>`;
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
                <td>${item.alokasi || '-'}</td>
                <td>${item.ket_instalasi || '-'}</td> <!-- TAMPILKAN KET INSTALASI -->
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

// Fungsi untuk memunculkan keterangan jika pilih Instalasi
function cekAlokasi() {
    const alokasi = document.getElementById('pinjamAlokasi').value;
    const divKetInstalasi = document.getElementById('divKetInstalasi');
    const inputKetInstalasi = document.getElementById('pinjamKetInstalasi');

    if (alokasi === 'Instalasi') {
        divKetInstalasi.classList.remove('d-none');
        inputKetInstalasi.required = true;
    } else {
        divKetInstalasi.classList.add('d-none');
        inputKetInstalasi.required = false;
        inputKetInstalasi.value = '';
    }
}

function bukaModalPinjam() {
    document.getElementById('formPinjam').reset();
    document.getElementById('divKeterangan').classList.add('d-none'); 
    document.getElementById('divKetInstalasi').classList.add('d-none'); 
    
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

document.getElementById('formPinjam').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nama = document.getElementById('pinjamNama').value;
    const statusPeminjam = document.getElementById('pinjamStatus').value;
    const keterangan = document.getElementById('pinjamKeterangan').value;
    const alatId = parseInt(document.getElementById('pinjamAlat').value);
    const alokasi = document.getElementById('pinjamAlokasi').value;
    const ketInstalasi = document.getElementById('pinjamKetInstalasi').value;
    const tanggal = document.getElementById('pinjamTanggal').value;
    
    const alat = dataAlat.find(a => a.id === alatId);
    
    const { error: errPinjam } = await supabaseClient.from('peminjaman').insert([{
        nama_peminjam: nama,
        status_peminjam: statusPeminjam,
        keterangan: keterangan,
        kode_alat: alat.kode,
        nama_alat: alat.nama,
        alokasi: alokasi,
        ket_instalasi: ketInstalasi,
        tanggal: tanggal,
        status: 'Dipinjam'
    }]);
    
    if (errPinjam) return alert("Gagal meminjam: " + errPinjam.message);

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

document.getElementById('formKembali').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('kembaliId').value);
    const kondisiBaru = document.getElementById('kembaliKondisi').value;
    const today = new Date().toISOString().split('T')[0];
    
    const pinjam = dataPeminjaman.find(p => p.id === id);
    
    const { error: errUpdate } = await supabaseClient.from('peminjaman').update({
        status: 'Kembali',
        tanggal_kembali: today,
        kondisi_kembali: kondisiBaru
    }).eq('id', id);
    
    if (errUpdate) return alert("Gagal update peminjaman: " + errUpdate.message);

    const statusAlatBaru = (kondisiBaru === 'Baik') ? 'Tersedia' : 'Tidak Tersedia';
    const { error: errAlat } = await supabaseClient.from('alat').update({
        kondisi: kondisiBaru,
        status: statusAlatBaru
    }).eq('kode', pinjam.kode_alat);
    
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
// 7. LOGIKA DATA ALAT
// ==========================================
function renderAlat() {
    const tbody = document.getElementById('tabelAlat');
    if (!tbody) return;
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
// 8. FUNGSI DOWNLOAD EXCEL (LAPORAN)
// ==========================================
function downloadExcel() {
    if (dataPeminjaman.length === 0) {
        alert("Belum ada data untuk diunduh!");
        return;
    }

    // Header CSV
    let csvContent = "No,Nama Peminjam,Status Peminjam,Alokasi,Ket Instalasi,Kode Alat,Nama Alat,Tgl Pinjam,Tgl Kembali,Kondisi Kembali,Status\n";

    // Isi Data
    dataPeminjaman.forEach((item, index) => {
        let nama = item.nama_peminjam.replace(/,/g, ' ');
        let ket = (item.keterangan || '').replace(/,/g, ' ');
        let ketInstalasi = (item.ket_instalasi || '').replace(/,/g, ' ');
        
        csvContent += `${index + 1},${nama},${item.status_peminjam},${item.alokasi || '-'},${ketInstalasi},${item.kode_alat},${item.nama_alat},${item.tanggal},${item.tanggal_kembali || '-'},${item.kondisi_kembali || '-'},${item.status}\n`;
    });

    // Membuat file dan memicu download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Peminjaman_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// 9. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    refreshData(); 
});
