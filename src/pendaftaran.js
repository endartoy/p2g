// Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyCONGznilbXu5WtCV1g5F6zZBiFFiUrsPo",
    authDomain: "ndrtproject.firebaseapp.com",
    projectId: "ndrtproject",
    storageBucket: "ndrtproject.appspot.com",
    messagingSenderId: "96529794892",
    appId: "1:96529794892:web:bdcb1ca0a1205cbc4ff1e9",
    measurementId: "G-WGG5E5SS3G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// auth google
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

document.addEventListener('alpine:init', () => {
    // PROP Alert
    Alpine.store('message', {
        class: false, 
        type: 'is-info', 
        text: '' ,

        showMessage(text, type = '') {
            this.text = text;
            this.type = type === '' ? 'is-info' : 'is-danger';
            this.class = true;
            setTimeout(() => {
                this.class = false;
                this.text = '';
                this.type = '';
            }, 5000);
        },
    });

    // loading
    Alpine.store('isLoading', true);

    // storedPage
    if ( !['pendaftaran', 'daftar hadir', 'data pemilih'].includes(localStorage.getItem('stored_page')) ) {
        localStorage.setItem('stored_page', 'pendaftaran');
        Alpine.store('page', 'pendaftaran');
    } else {
        Alpine.store('page', localStorage.getItem('stored_page'))
    }

    // Initialize the ndrtApp globally
    window.appInstance = ndrtApp();
    appInstance.init();  // Call the init method
});

function ndrtApp() {
    return {
        // prop
        _belumDaftar: [],

        antrianList: [],
        daftarHadir: [],
        dataList: [],

        init() {
            this.switchPage(Alpine.store('page'));
        },

        // page
        switchPage(x_page) {
            Alpine.store('page', x_page);
            localStorage.setItem('stored_page', x_page);

            this.readData()
        },

        // read all data
        // read
        readData() {
            Alpine.store('isLoading', true);

            db.collection('data_pemilih')
            .orderBy('no_urut', 'asc').onSnapshot((snapshot) => {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const page = Alpine.store('page');
                
                if (page === 'pendaftaran') {
                    this.antrianList = docs.filter(doc => doc._panggil === null && doc._daftar !== null);
                    this._belumDaftar = docs.filter(doc => doc._panggil === null && doc._daftar === null);
                } else if (page === 'daftar hadir') {
                    this.daftarHadir = docs.filter(doc => doc._panggil !== null);
                } else if (page === 'data pemilih') {
                    this.dataList = docs;
                }

                Alpine.store('isLoading', false);
            }, (error) => {
                Alpine.store('message').showMessage('Error fetching data: ' + error.message, 'error');
                Alpine.store('isLoading', false);
            });
        },

        // --------------------------------- Antrian -------------------------------------- //
        get dataPrioritas() {
            return this.antrianList.filter(i => i._prioritas == true);
        },

        get dataReguler() {
            return this.antrianList.filter(i => i._prioritas == false);
        },
        
        get belumDaftar() {
            return this._belumDaftar.filter(i => i.nama.includes(this.newSearch.query.toUpperCase()) || i.no_urut === parseInt(this.newSearch.query) );
        },

        // --------------------------------- Database ------------------------------------- //
        // get DPT
        get dataDPT(){
            if (this.filterNama !== '') {
                return this.dataList.filter(i => i.tipe === 'DPT' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.dataList.filter(i => i.tipe === 'DPT');
            }
        },

        // get DPTB
        get dataDPTB(){
            if (this.filterNama !== '') {
                return this.dataList.filter(i => i.tipe === 'DPTB' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.dataList.filter(i => i.tipe === 'DPTB');
            }
        },

        // get DPK
        get dataDPK(){
            if (this.filterNama !== '') {
                return this.dataList.filter(i => i.tipe === 'DPK' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.dataList.filter(i => i.tipe === 'DPK');
            }
        },

        // ================================ Daftar Hadir ===================================
        // get DPT
        get daftarHadirDPT(){
            if (this.filterNama !== '') {
                return this.daftarHadir.filter(i => i.tipe === 'DPT' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.daftarHadir.filter(i => i.tipe === 'DPT');
            }
        },

        // get DPTB
        get daftarHadirDPTB(){
            if (this.filterNama !== '') {
                return this.daftarHadir.filter(i => i.tipe === 'DPTB' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.daftarHadir.filter(i => i.tipe === 'DPTB');
            }
        },

        // get DTK
        get daftarHadirDPK(){
            if (this.filterNama !== '') {
                return this.daftarHadir.filter(i => i.tipe === 'DPK' && i.nama.includes(this.filterNama.toUpperCase()) );
            } else {
                return this.daftarHadir.filter(i => i.tipe === 'DPK');
            }
        },
        
    }
}

function pendaftaran() {
    const initialSearch = {
        tipe: 'DPT',
        query: '',
    }

    return {
        // prop
        form: false,
        formAksi: false,

        // data
        dataSelect: null,
        
        // pencarian 
        newSearch: { ...initialSearch },

        init() {
            // this.readData();
        },

        resetForm(q = 'form'){
            if (q == 'form') {
                this.form = false;
                this.newSearch = { ...initialSearch };
                this.searchList = [];
            } else if (q == 'formAksi') {
                this.formAksi = false
                this.dataSelect = null;
            }

            document.documentElement.classList.remove('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
        },

        openForm(q, data = null) {
            if (q == 'form') {
                this.form = true
            } else if (q == 'formAksi') {
                this.formAksi = true
                this.dataSelect = data
            }

            document.documentElement.classList.add('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(q); });
        },

        // tambahkan ke antrian
        tambahDaftar(item) {
            if (this.item.id !== null) {
                Alpine.store('isLoading', true);
                db.collection('data_pemilih').doc(item.id).update({
                    _daftar: firebase.firestore.FieldValue.serverTimestamp(),
                    _prioritas: item._prioritas
                }).then(() => {
                    Alpine.store('message').showMessage('Tambah data berhasil.');
                    this.resetForm('form')
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
            }
        },

        // hapus dari antrian
        hapusDaftar() {
            if (this.dataSelect.id !== null) {
                if (confirm("Hapus "+ this.dataSelect.nama +" dari antrian ?")) {
                    Alpine.store('isLoading', true);
                    db.collection('data_pemilih').doc(this.dataSelect.id).update({
                        _daftar: null
                    }).then(() => {
                        Alpine.store('message').showMessage('Hapus data berhasil');
                        this.resetForm('formAksi');
                    }).catch((error) => {
                        Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                    }).finally(() => {
                        Alpine.store('isLoading', false);
                    });
                }
            }
        },

        // panggil
        panggil() {
            if (this.dataSelect.id !== null) {
                const doX = confirm("Panggil "+ this.dataSelect.nama +" dari antrian ?")
                if (!doX) return;

                Alpine.store('isLoading', true);
                db.collection('data_pemilih').doc(this.dataSelect.id).update({
                    _panggil: firebase.firestore.FieldValue.serverTimestamp(),
                }).then(() => {
                    Alpine.store('message').showMessage('Done');
                    this.resetForm('formAksi');
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
            }
        }

    }
}

function _daftarHadir() {
    const initialItem = {
        id: '',
        tipe: 'DPT',
        no_urut: null,
        nama: '',
        nik: '',
        alamat: '',
        jk: 'L',
        umur: null,
        _prioritas: false,
        _daftar: null,
        _panggil: null
    }

    return {
        // prop
        form: false,
        filterNama: '',
        filterTipe: 'SEMUA',

        // data
        // dataList: [],
        item: { ...initialItem },

        init() {
            
        },

        // reset form
        resetForm(q='update'){
            if (q == 'update') {
                this.form = false
                this.item = { ...initialItem }
            }

            document.documentElement.classList.remove('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
        },

        // aksi
        aksi(data){
            this.item = data;

            this.form = true;
            document.documentElement.classList.add('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(); });
        },

        // hapus
        deleteItem(item) {
            if (confirm("Hapus "+ item.nama +" dari daftar hadir ?")){
                Alpine.store('isLoading', true);
                db.collection('data_pemilih').doc(item.id)
                .update({
                    _panggil: null
                })
                .then(() => {
                    this.resetForm()
                    Alpine.store('message').showMessage('Hapus data berhasil');
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
            }
        },

        // generatePDF
        printPDF() {
            const doPrint = confirm("Eksport data ke PDF ?")
            if (!doPrint) return;

            const options = { day: '2-digit', month: '2-digit', year: '2-digit' };

            // prepare data
            let tableDataList = null
            let tableHeaderDataList = [[
                { content: '#',styles: { halign: 'center' } },
                { content: 'NO.URUT',styles: { halign: 'center' } },
                { content: 'NAMA',styles: { halign: 'center' } },
                { content: 'JK',styles: { halign: 'center' } }, 
                { content: 'ALAMAT',styles: { halign: 'center', cellWidth: 55} }, 
            ]]

            if (this.dataList.length > 0) {
                // Create table data for table Pemasukan
                tableDataList = this.dataList.map((res, index) => [
                    { content: index + 1, styles: { halign: 'center'} },
                    { content: res.tipe + ' ' + res.no_urut },
                    res.nama,
                    {content: res.jk, styles: { halign: 'center'}},
                    res.alamat
                ]);
            } else {
                tableDataList = [[{ content: 'TIDAK ADA DATA', colSpan: 5, styles: { halign: 'center' } }]];
            }

            // dummy
            // for (let i = 0; i < 230; i++) {
            //     tableDataList.push(
            //         [
            //             { content: i+ 1, styles: { halign: 'center'} },
            //             { content: 'DPT '+i },
            //             'NUR EKO WOBOSOW SASIMSKHS SASAS',
            //             {content: 'L', styles: { halign: 'center'}},
            //             'KARANGJOHO RT 03 RW 06'
            //         ]
            //     )
            // }

            // Access jsPDF from the UMD bundle
            const { jsPDF } = window.jspdf;
            // Create a new jsPDF document
            const doc = new jsPDF();

            
            // 1. Add a Page Title
            doc.setFontSize(18); // Set title font size
            doc.text("DAFTAR HADIR TPS 4 DS. DALEMAN \r\nPILKADA TAHUN " + new Date().toLocaleDateString("id-ID", { year: 'numeric' }), doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            // 2. Table
            // table daftar hadir
            doc.autoTable({
                startY: 40,          // Set where the table should start on the page
                head: tableHeaderDataList,
                body: tableDataList,
                tableWidth: 'auto', // Ensure the table fits within the page
                // margin: { top: 15, left: 25, right: 25 }, // Add margins
            });

            // table info
            doc.autoTable({
                html: "#tableInfo",
                useCss: true,        // Preserve any inline CSS styles
                tableWidth: 'wrap',
                pageBreak: 'avoid'
            })

            // 4. Add a footer with page number (optional)
            let pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);

                doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, {
                    align: 'right'
                });

                doc.text('TPS 4 DS. DALEMAN ' + new Date().toLocaleDateString('id-ID', options), 14, doc.internal.pageSize.getHeight() - 10, {
                    align: 'left'
                });
            }

            // Save the PDF
            doc.save('Daftar Hadir PILKADA TPS 4 Ds. Daleman ('+ new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +').pdf');
        }

    }
}

function dataPemilih() {
    const initialItem = {
        id: '',
        tipe: 'DPT',
        no_urut: null,
        nama: '',
        nik: '',
        alamat: '',
        jk: 'L',
        umur: null,
        _prioritas: false,
        _daftar: null,
        _panggil: null
    }

    return {
        // prop
        form: false,
        filterNama: '',
        filterTipe: 'SEMUA',

        // data
        no_urut: {
            'DPT': 1,
            'DPTB': 1,
            'DPK': 1,
        },
        item: { ...initialItem },

        init() {

        },

        // count no urut
        count_no_urut(){
            if (this.item.id === '') {
                const data = appInstance.dataList.filter( i => i.tipe === this.item.tipe )
                this.item.no_urut = data.length > 0 ? data.slice(-1)[0].no_urut + 1 : 1
            }
        },

        // reset form
        resetForm(q='update'){
            if (q == 'update') {
                this.form = false
                this.item = { ...initialItem }
            }

            document.documentElement.classList.remove('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
        },

        // aksi
        aksi(data = null){         
            this.item = data ? { ...data } : { ...initialItem }; this.count_no_urut();

            this.form = true;
            document.documentElement.classList.add('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(); });
        },

        // save
        saveItem(){
            Alpine.store('isLoading', true);

            this.item.no_urut = +this.item.no_urut
            this.item.umur = +this.item.umur
            
            const { id, ...data } = this.item;
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].toUpperCase();
                }
            });

            let task = db.collection('data_pemilih')

            if (id !== '') {
                task = 
                task.doc(id).update({
                    ...data
                })
            } else {
                task = 
                task.add({
                    ...data
                })
            }

            task.then(() => {
                if (id !== '') {
                    Alpine.store('message').showMessage('Updata data berhasil');
                } else {
                    Alpine.store('message').showMessage('Tambah data berhasil');
                }
                this.resetForm();
            }).catch((error) => {
                Alpine.store('message').showMessage('Error: ' + error.message, 'error');
            }).finally(() => {
                Alpine.store('isLoading', false);
            });
        },

        // hapus
        deleteItem(item) {
            if (confirm("Hapus data "+ item.nama +" ?")){
                Alpine.store('isLoading', true);
                db.collection('data_pemilih').doc(item.id).delete().then(() => {
                    this.resetForm()
                    Alpine.store('message').showMessage('Hapus data berhasil');
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
            }
        }

    }
}