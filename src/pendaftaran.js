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

        showMessage(text, type = '', time = 5000) {
            this.text = text;
            this.type = type === '' ? 'is-info' : 'is-danger';
            this.class = true;
            setTimeout(() => {
                this.class = false;
                this.text = '';
                this.type = '';
            }, time);
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

    // User Info
    Alpine.store('user_info', {
        user: !localStorage.getItem('stored_user') ? localStorage.getItem('stored_user') : null,
        userRole: localStorage.getItem('stored_userRole') || '',

        reset() {
            localStorage.setItem('stored_user', null);
            localStorage.setItem('stored_userRole', '');

            this.user = null;
            this.userRole = '';
        }
    })

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
            auth.onAuthStateChanged(async user => {
                if (!user) {
                    // Gagal login
                    Alpine.store('message').showMessage("Login gagal", 'error');
                    return
                }

                const rolesRef = firebase.firestore().collection('roles').doc(user.uid);
                const rolesDoc = await rolesRef.get();

                if (rolesDoc.data().role === 'tps') {
                    Alpine.store('user_info').user = user
                    localStorage.setItem('stored_user', user)

                    Alpine.store('user_info').userRole = rolesDoc.data().role
                    localStorage.setItem('stored_userRole', rolesDoc.data().role)

                    this.switchPage(Alpine.store('page'));
                } else {
                    // Gagal login
                    Alpine.store('message').showMessage("Login gagal : User tidak terdaftar ! (Silahkan hubungi admin.)", 'error');
                    this.logout()
                }

            })

            Alpine.store('isLoading', false);
        },

        // LOGIN
        loginWithGoogle() {
            auth.signInWithPopup(provider).then(() => {
                Alpine.store('message').showMessage('Login berhasil.');
            }).catch((error) => {
                Alpine.store('message').showMessage('Login failed: ' + error.message, 'error');
            });
        },

        logout() {
            auth.signOut().then(() => {
                Alpine.store('message').showMessage('Logged out successfully');
                Alpine.store('user_info').reset();
            }).catch((error) => {
                Alpine.store('message').showMessage('Logout failed: ' + error.message, 'error');
            });
        },

        // page
        switchPage(x_page) {
            if (!Alpine.store('user_info').user) {
                alert('USER TIDAK TERDAFTAR !')
                return
            }

            Alpine.store('page', x_page);
            localStorage.setItem('stored_page', x_page);
            this.readData()
        },

        // read all data
        // read
        readData() {
            Alpine.store('isLoading', true);
            
            const page = Alpine.store('page');
            const q = {
                'pendaftaran': '_daftar',
                'daftar hadir': '_panggil'
            }[page] || 'no_urut';

            db.collection('data_pemilih')
            .orderBy(q, 'asc').onSnapshot((snapshot) => {
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                switch (page) {
                    case 'pendaftaran':
                        this.antrianList = docs.filter(doc => doc._panggil === null && doc._daftar !== null);
                        this._belumDaftar = docs.filter(doc => doc._panggil === null && doc._daftar === null);
                        break;
                    case 'daftar hadir':
                        this.daftarHadir = docs
                            .filter(doc => doc._panggil !== null)
                            .map(data => {
                                return {
                                    ...data,
                                    _panggil : data._panggil.toDate().toLocaleString('id-ID')
                                }
                            });
                        break;
                    case 'data pemilih':
                        this.dataList = docs;
                        break;
                    default:
                        Alpine.store('message').showMessage('Error fetching data', 'error');
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
            return this.dataList.filter(i => i.tipe === 'DPT' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true)
            );
        },

        // get DPTB
        get dataDPTB(){
            return this.dataList.filter(i => i.tipe === 'DPTB' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true)
            );
        },

        // get DPK
        get dataDPK(){
            return this.dataList.filter(i => i.tipe === 'DPK' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true)
            );
        },

        // ================================ Daftar Hadir ===================================

        // filter jenik kelamin
        f_l: false,
        f_p: false,

        get filterJK() {
            if (this.f_l) {
                return 'L'
            }
            if (this.f_p) {
                return 'P'
            }
            return false
        },

        // get DPT
        get daftarHadirDPT(){
            return this.daftarHadir.filter(i => i.tipe === 'DPT' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true) &&
                (this.filterJK ? i.jk === this.filterJK : true)
            );
        },

        // get DPTB
        get daftarHadirDPTB(){
            return this.daftarHadir.filter(i => i.tipe === 'DPTB' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true) &&
                (this.filterJK ? i.jk === this.filterJK : true)
            );
        },

        // get DTK
        get daftarHadirDPK(){
            return this.daftarHadir.filter(i => i.tipe === 'DPK' && 
                (this.filterNama ? i.nama.includes(this.filterNama.toUpperCase()) : true) &&
                (this.filterJK ? i.jk === this.filterJK : true)
            );
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

            if (this.daftarHadir.length > 0) {
                // Create table data for table Pemasukan
                tableDataList = this.daftarHadir.map((res, index) => [
                    { content: index + 1, styles: { halign: 'center'} },
                    { content: res.tipe + ' ' + res.no_urut },
                    res.nama,
                    {content: res.jk, styles: { halign: 'center'}},
                    res.alamat
                ]);
            } else {
                tableDataList = [[{ content: 'TIDAK ADA DATA', colSpan: 5, styles: { halign: 'center' } }]];
            }

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
                // useCss: true,        // Preserve any inline CSS styles
                theme: 'grid',
                tableWidth: 'wrap',
                pageBreak: 'avoid',
                didParseCell: function(data) {
                    const cell = data.cell.styles
                    if (data.column.index > 0) {
                        cell.halign = 'right'
                        cell.cellWidth = 20
                    }
                }
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

    const initialAlamat = [
        'GADEN RT 01',
        'GADEN RT 02',
        'GADEN RT 03',
        'KARANGJOHO',
        'PATOMAN'
    ]

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
        },


        // alamat dropdown
        alamat: initialAlamat,
        dropdownItems: [],
        filterAlamat() {
            if (this.item.alamat) {
                const query = this.item.alamat.toUpperCase();
                this.dropdownItems = this.alamat.filter(item => 
                    item.toUpperCase().includes(query)
                );
            } else {
                this.dropdownItems = initialAlamat;
            }
        },
        
    }
}