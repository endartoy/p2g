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
        user: !localStorage.getItem('stored_user') ? JSON.parse(localStorage.getItem('stored_user')) : null,
        userRole: localStorage.getItem('stored_userRole') || '',

        reset() {
            localStorage.setItem('stored_user', null);
            localStorage.setItem('stored_userRole', '');

            this.user = null;
            this.userRole = '';
        }
    })

});

function ndrtApp() {
    // Initial from data pemilih page
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
        _panggil: null,
        _delete: false,
        _lastUpdate: null
    }

    const initialAlamat = [
        'GADEN RT 01',
        'GADEN RT 02',
        'GADEN RT 03',
        'KARANGJOHO',
        'PATOMAN'
    ]

    const initialNav = {
        prev: false, next: false
    }

    const initialHadirInfo = {
        v: false, L: 0, P: 0 
    }

    // Initial from Pendaftaran Page
    const initialSearch = {
        tipe: 'DPT',
        query: '',
    }

    return {
        // LOGIN
        loginWithGoogle() {
            auth.signInWithPopup(provider).then(() => {
                Alpine.store('message').showMessage('Login berhasil.');
            }).catch((error) => {
                Alpine.store('message').showMessage('Login failed: ' + error.message, 'error');
            });
        },

        // logout
        logout() {
            auth.signOut().then(() => {
                Alpine.store('message').showMessage('Logged out successfully');
                Alpine.store('user_info').reset();
            }).catch((error) => {
                Alpine.store('message').showMessage('Logout failed: ' + error.message, 'error');
            });
        },

        // switch page
        switchPage(x_page) {
            if (!Alpine.store('user_info').user) {
                alert('USER TIDAK TERDAFTAR !')
                return
            }

            Alpine.store('page', x_page);
            localStorage.setItem('stored_page', x_page);
        },

        // Prop
        // JK, Umur, Alamat
        tableHeader: [true, false, true, false], // JK, Umur, Alamat, NIK

        form: false,
        formAksi: false,

        filterNama: '',
        filterTipe: 'SEMUA',

        item: { ...initialItem },

        // set for local database & last update date
        localDatabase: {},
        lastUpdate: null,

        setLastUpdate(){
            let dateTime = new Date()
            dateTime.setSeconds(dateTime.getSeconds() - 1)
            this.lastUpdate = dateTime
            
            // simpan lastupdate date ke lokal storage
            localStorage.setItem('lastUpdate', this.lastUpdate.toISOString())
            // console.log('last update date =>', localStorage.getItem('lastUpdate'))
        },

        // function to add / update data
        addOrUpdate(doc, successMessage, action){
            doc.umur = +doc.umur
            doc._lastUpdate = new Date()
            
            let { id, ...data } = doc;
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string') {
                    data[key] = data[key].toUpperCase();
                }
            });

            Alpine.store('isLoading', true)

            db.collection('data_pemilih')
            .doc(id)
            .set(data)
            .then(() => {
                action()
                Alpine.store('isLoading', false);
                successMessage()
            })
            .catch((error) => {
                Alpine.store('isLoading', false);
                Alpine.store('message').showMessage('Error: ' + error.message, 'error');
            });

        },

        // 1. Data Pemilih ---------------------------------------------------------------
        // get all data from database
        // dataPemilih: [],
        dataPemilihByTipe: { DPT: [], DPTB: [], DPK: [] },
        dataPemilihCount: {
            DPT:  { L: 0, P: 0 },
            DPTB:  { L: 0, P: 0 },
            DPK:  { L: 0, P: 0 },
            TOTAL: { L: 0, P: 0 }
        },

        unsubListener: null,
        getDataPemilih(reset = false) {
            Alpine.store('isLoading', true)

            // 2024-11-18T16:46:29.541Z
            const _lastUpdate = localStorage.getItem('lastUpdate') 
                ? new Date(localStorage.getItem('lastUpdate')) 
                : new Date('2024-11-17T16:46:29.541Z'); // First load

            this.lastUpdate = reset 
                ? new Date('2024-11-17T16:46:29.541Z') // Reset database
                : _lastUpdate;

            // get old local database
            if(reset == true) {
                localStorage.setItem('localDatabase', JSON.stringify({}))
                console.log('lokal database =>', JSON.parse(localStorage.getItem('localDatabase')))
            }

            const _local = localStorage.getItem('localDatabase') ?
                JSON.parse(localStorage.getItem('localDatabase')) :
                {}

            this.localDatabase = _local

            if (this.unsubListener) {
                this.unsubListener()
            }

            var isFirstLoad = true

            this.unsubListener = db.collection('data_pemilih')
            .where('_lastUpdate', '>=', this.lastUpdate)
            .orderBy('_lastUpdate')
            .orderBy('no_urut', 'asc')
            .onSnapshot((snapshot) => {
                try {
                    if (snapshot.docChanges().length > 0) {
                        console.log('data baru =>', snapshot.docChanges().length)
    
                        snapshot.docs.forEach((doc) => {
                            this.localDatabase[doc.id] = { ...doc.data() }
                        })

                        if (!isFirstLoad) {
                            this.fetchDaftarHadir()
                        }
    
                        // simpan database ke local database
                        localStorage.setItem('localDatabase', JSON.stringify(this.localDatabase))
                        // console.log('lokal database =>', JSON.parse(localStorage.getItem('localDatabase')))
    
                        // set new last update date time after do changes
                        this.setLastUpdate()
                    }                    
                } finally {
                    if (isFirstLoad) {
                        isFirstLoad = false

                        this.fetchDaftarHadir()

                    }
    
                    Alpine.store('isLoading', false)
                }
            }, (error) => {
                Alpine.store('isLoading', false)
                Alpine.store('message').showMessage('Error fetching data: ' + error.message, 'error');
            })

        },

        get dataPemilih() {
            let data = []

            Object.entries(this.localDatabase)
            .sort(([id1], [id2]) => id1.localeCompare(id2)) // sort data (chrome mess)
            .filter(([_,doc]) => doc._delete == false)
            .forEach(([id, doc]) => {
                data.push({ 
                    id, 
                    ...doc, 
                });
            });

            this.dataPemilihCount.TOTAL = { L: 0, P: 0, }

            Object.keys(this.dataPemilihByTipe).forEach(key => {
                let filtered = data.filter(i => i.tipe === key )

                this.dataPemilihByTipe[key] = filtered

                let countL = filtered.filter(a => a.jk === 'L').length
                let countP = filtered.filter(a => a.jk === 'P').length

                this.dataPemilihCount[key] = {
                    L: countL,
                    P: countP,         
                }


                this.dataPemilihCount.TOTAL.L += countL
                this.dataPemilihCount.TOTAL.P += countP
            })

            // console.log(this.dataPemilihByTipe)
            // console.log(this.dataPemilihCount)
            // console.log('ini dataPemilih => ', data)

            return data
        },

        // Manipulate Data and do pagination
        getData(source, page, nav, infoHadir, firstRow, maxRows, filterNama){
            // def 
            const start = page == 1 ? 0 : firstRow + ( page - 2 ) * maxRows 
            const end = page == 1 ? firstRow : start + maxRows

            // filter data
            const filteredData = source.filter(i => 
                (filterNama ? i.nama.includes(filterNama.toUpperCase()) : true )
            )

            // get total page 
            const totalPage = Math.ceil((filteredData.length - firstRow) / maxRows) + 1

            // set nav prop
            nav.prev = page <= 1
            nav.next = page + 1 > totalPage

            // slice data
            let paginatedData = filteredData.slice(start, end)

            // info kehadiran per page
            if (!filterNama) {
                infoHadir.v = true

                Object.keys(infoHadir).forEach(key => {
                    if (key !== 'v') {
                        infoHadir[key] = paginatedData.filter(doc => 
                            doc.jk == key && doc._panggil != null
                        ).reduce((count, _) => count + 1, 0);
                    }
                })
            } else {
                infoHadir.v = false
            }

            // return
            return paginatedData
        },

        // Pagination
        firstRows: 10,
        maxRows: 16,

        // cofig for pagination
        config() {
            this.firstRows = parseInt(prompt('Halaman 1', this.firstRows), 10)
            this.maxRows = parseInt(prompt('Halama 2 dst', this.maxRows), 10)

            this.pageDPK = this.pageDPT = this.pageDPTB = 1
        },

        // reset local database
        resetLocalDatabase() {
            if (confirm("Reset local database")) {
                this.getDataPemilih(true)
            }
        },

        // DPT
        navDPT: { ...initialNav },
        pageDPT: 1,
        infoHadirDPT: { ...initialHadirInfo },
        get dataDPT() {
            return  this.getData(this.dataPemilihByTipe.DPT, this.pageDPT, this.navDPT, this.infoHadirDPT, 
                this.firstRows, this.maxRows, this.filterNama)
        },

        // DPTB
        navDPTB: { ...initialNav },
        pageDPTB: 1,
        infoHadirDPTB: { ...initialHadirInfo },
        get dataDPTB() {
            return this.getData(this.dataPemilihByTipe.DPTB, this.pageDPTB, this.navDPTB, this.infoHadirDPTB, 
                this.firstRows, this.maxRows, this.filterNama)
        },

        // DPK
        navDPK: { ...initialNav },
        pageDPK: 1,
        infoHadirDPK: { ...initialHadirInfo },
        get dataDPK() {
            return this.getData(this.dataPemilihByTipe.DPK, this.pageDPK, this.navDPK, this.infoHadirDPK, 
                this.firstRows, this.maxRows, this.filterNama)
        },

        // reset form
        resetForm(q = 'update'){
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
            Alpine.store('isLoading', true)

            let data = this.item
            data.tipe = data.tipe.toUpperCase()
            data.no_urut = data.no_urut.toString().padStart(3, '0')

            let message = () => Alpine.store('message').showMessage('Updata data berhasil')

            if (data.id == '') {
                data.id = data.tipe + data.no_urut
                message = () => Alpine.store('message').showMessage('Tambah data berhasil')
            }

            let action = () =>  {                
                this.resetForm()
            }

            this.addOrUpdate(data, message, action)
        },

        // hapus
        deleteItem(item) {
            if (confirm("Hapus data "+ item.nama +" ?")){
                let data = this.item
                let message = () => Alpine.store('message').showMessage('Hapus data berhasil');


                data._delete = true

                let action = () =>  {        
                    const targetArray = 
                        item.tipe === 'DPT' ? this.dataPemilihByTipe.DPT : 
                        item.tipe === 'DPTB' ? this.dataPemilihByTipe.DPTB : 
                        this.dataPemilihByTipe.DPK

                    // get total page 
                    const totalPage = Math.ceil((targetArray.length - this.firstRows) / this.maxRows) + 1
                    
                    // Update halaman jika halaman terakir kosong
                    if (['DPT', 'DPTB', 'DPK'].includes(item.tipe)) {
                        const pageKey = `page${item.tipe}`;
                        this[pageKey] = this[pageKey] === 1 ? 1 : 
                                        this[pageKey] > totalPage ? this[pageKey] - 1 : 
                                        this[pageKey];
                    }
                    
                    this.resetForm()
                }

                this.addOrUpdate(data, message, action)
            }
        },

        // count no urut
        count_no_urut(){
            if (!this.item.id) {
                const targetArray = 
                    this.item.tipe === 'DPT' ? this.dataPemilihByTipe.DPT : 
                    this.item.tipe === 'DPTB' ? this.dataPemilihByTipe.DPTB : 
                    this.item.tipe === 'DPK' ? this.dataPemilihByTipe.DPK : []

                    
                let id = targetArray.length
                // this.item.no_urut = id == 0 ? 1 : targetArray[id-1].no_urut + 1

                id = id == 0 ? 0 : targetArray[id-1].no_urut
                this.item.no_urut = (parseInt(id) + 1).toString().padStart(3, '0')
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

        // 2. Pendaftaran --------------------------------------------------------------------------------
        // get & filter data anrtian
        get dataPrioritas() {
            const data = this.dataPemilih.filter(doc => 
                doc._daftar != null &&
                doc._panggil == null &&
                doc._prioritas == true
            ).sort((a, b) => a._daftar - b._daftar);

            return data;
        },

        get dataReguler() {
            const data = this.dataPemilih.filter(doc => 
                doc._daftar != null &&
                doc._panggil == null &&
                doc._prioritas == false
            ).sort((a, b) => a._daftar - b._daftar);

            return data;
        },
        
        // Data belum daftar
        belumDaftar: [],
        newSearch: { ...initialSearch },
        cariBelumDaftar(){
            let q = this.newSearch.query.toUpperCase()

            if (q) {
                Alpine.store('isLoading', true)

                setTimeout(() => {
                    this.belumDaftar = this.dataPemilih.filter(doc => 
                        ( doc.no_urut == q.toString().padStart(3, '0') ||
                        doc.nama.includes(q) ) &&  
                        doc._daftar == null &&
                        doc._panggil == null
                    )
    
                    if (this.belumDaftar.length <= 0) {
                        Alpine.store('message').showMessage("Data tidak ditemukan", 'error')
                        this.newSearch.query = ''
                    } else {
                        this.$refs.inputFilter.blur()
                    }

                    Alpine.store('isLoading', false)
                }, 1500)
            } 
        },

        // tambahkan ke antrian
        tambahDaftar(item) {
            if (this.item.id !== null) {

                let data = item
                data._daftar = new Date()

                let message = () => Alpine.store('message').showMessage('Berhasil menambahkan ke daftar antrian')
                let action = () =>  {                
                    this.newSearch = { ...initialSearch };
                    this.belumDaftar = [];
                    this.$refs.inputFilter.focus()
                }

                this.addOrUpdate(data, message, action)
            }
        },

        // hapus dari antrian
        hapusDaftar(item) {
            if (item.id !== null) {
                if (confirm("Hapus "+ item.nama +" dari antrian ?")) {
                    let data = item
                    data._daftar = null
                
                    let message = () => Alpine.store('message').showMessage('Hapus data berhasil')
                    let action = () =>  {             
                        this.resetForm('formAksi')
                    }
    
                    this.addOrUpdate(data, message, action)
                }
            }
        },

        // panggil antrian
        panggil(item) {
            if (item.id !== null) {
                const doX = confirm("Panggil "+ item.nama +" dari antrian ?")
                if (!doX) return;

                let data = item
                data._panggil = new Date()
            
                let message = () => Alpine.store('message').showMessage('Hapus data berhasil')
                let action = () =>  {
                    this.resetForm('formAksi')
                    Alpine.store('message').showMessage('Done');             
                }

                this.addOrUpdate(data, message, action)
            }
        },

        resetForm(q = 'form'){
            if (q == 'form') {
                this.form = false;
                this.newSearch = { ...initialSearch };
                this.belumDaftar = [];
            } else if (q == 'formAksi') {
                this.formAksi = false
                this.item = { ...initialItem }
            }

            // enable scroll
            document.documentElement.classList.remove('is-clipped')
            
            // Listen for the back button press
            history.pushState(null, '', '');
        },

        openForm(q, data = null) {
            if (q == 'form') {
                this.form = true
            } else if (q == 'formAksi') {
                this.formAksi = true
                this.item = { ...data }
            }

            // disable scroll
            document.documentElement.classList.add('is-clipped')

            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(q); });
        },

        // 3. Daftar Hadir -----------------------------------------------------------------------
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

        daftarHadirCount: {
            DPT:  { L: 0, P: 0 },
            DPTB:  { L: 0, P: 0 },
            DPK:  { L: 0, P: 0 },
            TOTAL: { L: 0, P: 0 }
        },

        formatTimestamp (timeStamp) {
            if (timeStamp) {
                const date = new Date(timeStamp.seconds * 1000 + timeStamp.nanoseconds / 1e6);
                return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
            } else {
                return '****'
            }
        },

        daftarHadir: [],
        async fetchDaftarHadir(){
            Alpine.store('isLoading', true)
            try {
                // Simulate async operation
                const data = await new Promise((resolve) => {
                    setTimeout(() => {
                        let filteredData = this.dataPemilih.filter(doc => doc._panggil != null);

                        if (this.filterNama) {
                            this.filterJK = false;

                            filteredData = filteredData.filter(doc =>
                                doc.nama.includes(this.filterNama.toUpperCase())
                            );
                        } else if (this.filterJK) {
                            this.filterNama = '';
                            filteredData = filteredData.filter(doc => doc.jk == this.filterJK);
                        }

                        if (!this.filterNama && !this.filterJK) {
                            this.daftarHadirCount.TOTAL = { L: 0, P: 0 };
                            Object.keys(this.dataPemilihByTipe).forEach(i => {
                                this.daftarHadirCount[i] = {
                                    L: filteredData.filter(doc => doc.tipe == i && doc.jk == 'L').length,
                                    P: filteredData.filter(doc => doc.tipe == i && doc.jk == 'P').length
                                };

                                this.daftarHadirCount.TOTAL = {
                                    L: this.daftarHadirCount.TOTAL.L + this.daftarHadirCount[i].L,
                                    P: this.daftarHadirCount.TOTAL.P + this.daftarHadirCount[i].P
                                };
                            });
                        }

                        filteredData = filteredData.sort((a, b) => a._panggil - b._panggil);

                        resolve(filteredData); // Resolve with the filtered data
                    }, 1000); 
                });

                // return data;
                this.daftarHadir = data
            } finally {
                Alpine.store('isLoading', false)
            }
        },

        dh_resetForm(q='update'){
            if (q == 'update') {
                this.form = false
                this.item = { ...initialItem }
            }

            document.documentElement.classList.remove('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
        },

        // aksi
        dh_aksi(data){
            this.item = data;

            this.form = true;
            document.documentElement.classList.add('is-clipped')
            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(); });
        },

        // hapus
        dh_deleteItem(item) {
            if (confirm("Hapus "+ item.nama +" dari daftar hadir ?")){

                let data = item
                data._panggil = null

                let message = () => Alpine.store('message').showMessage('Hapus data berhasil.')
                let action = () =>  {                
                    this.resetForm()
                }

                this.addOrUpdate(data, message, action)
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
                { content: 'NO.URUT',styles: { halign: 'center', cellWidth: 25 } },
                { content: 'NAMA',styles: { halign: 'center' } },
                { content: 'JK',styles: { halign: 'center' } }, 
                // { content: 'UMUR',styles: { halign: 'center' } }, 
                { content: 'ALAMAT',styles: { halign: 'center', cellWidth: 50} },
                // { content: 'KET',styles: { halign: 'center', cellWidth: 30 } }, 
            ]]

            if (this.daftarHadir.length > 0) {
                // Create table data for table Pemasukan
                tableDataList = this.daftarHadir.map((res, index) => [
                    { content: index + 1, styles: { halign: 'center'} },
                    { content: res.tipe + ' ' + res.no_urut },
                    res.nama,
                    {content: res.jk, styles: { halign: 'center'}},
                    // {content: res.umur, styles: { halign: 'center'}},
                    res.alamat,
                    // this.formatTimestamp(res._panggil)
                ]);
            } else {
                tableDataList = [[{ content: 'TIDAK ADA DATA', colSpan: 5, styles: { halign: 'center' } }]];
            }

            // Access jsPDF from the UMD bundle
            const { jsPDF } = window.jspdf;
            // Create a new jsPDF document
            const doc = new jsPDF();

            
            // 1. Add a Page Title
            doc.setTextColor('#000000')
            doc.setFontSize(18); // Set title font size
            doc.text("DAFTAR HADIR TPS 4 DS. DALEMAN \r\nPILKADA TAHUN " + new Date().toLocaleDateString("id-ID", { year: 'numeric' }), doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            // 2. Table
            // table daftar hadir
            doc.autoTable({
                startY: 40,          // Set where the table should start on the page
                theme: 'striped',
                head: tableHeaderDataList,
                body: tableDataList,
                bodyStyles: {
                    textColor: [0, 0, 0] 
                },
                tableWidth: 'auto', // Ensure the table fits within the page
                // margin: { top: 15, left: 25, right: 25 }, // Add margins
                margin: { bottom: 20 },
            });

            // table info
            doc.autoTable({
                html: "#tableInfo",
                // useCss: true,        // Preserve any inline CSS styles
                theme: 'grid',
                tableWidth: 'wrap',
                pageBreak: 'avoid',
                bodyStyles: {
                    textColor: [0, 0, 0] 
                },
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
        },

        // init
        init() {
            auth.onAuthStateChanged(async user => {
                if (!user) {
                    // Gagal login
                    Alpine.store('message').showMessage("Login gagal", 'error');
                    return
                }

                const rolesRef = firebase.firestore().collection('roles').doc(user.uid);
                const rolesDoc = await rolesRef.get();

                if (['tps', 'superadmin'].includes(rolesDoc.data().role)) {
                    Alpine.store('user_info').user = user
                    localStorage.setItem('stored_user', JSON.stringify(user))

                    Alpine.store('user_info').userRole = rolesDoc.data().role
                    localStorage.setItem('stored_userRole', rolesDoc.data().role)

                    // get data from database
                    this.getDataPemilih()

                    this.switchPage(Alpine.store('page'));
                } else {
                    // Gagal login
                    Alpine.store('message').showMessage("Login gagal : User tidak terdaftar ! (Silahkan hubungi admin.)", 'error');
                    this.logout()
                }

            })
        },

        // create dummy data
        dummy(jumlah = prompt('jumlah data ?')){
            this.localDatabase = {}
            localStorage.setItem('localDatabase', JSON.stringify(this.localDatabase))
            console.log('lokal database =>', JSON.parse(localStorage.getItem('localDatabase')))
 
            this.setLastUpdate()

            fetch('dpt.json')
            .then((res) => {
                if (!res.ok) {
                    console.log('error')
                } else {
                    return res.json()
                }
            }).then((res) => {
                
                // let task = db.collection('data_pemilih')
                // let data = { ...initialItem }
                // data._lastUpdate = new Date()

                // for (let i = 0; i <= res.length - 1; i++ ) {
                    
                //     data.id = 'DPT' + res[i].no_urut.toString().padStart(3, '0');
                //     data.tipe = 'DPT'
                //     data.no_urut = res[i].no_urut.toString().padStart(3, '0')
                //     data.nik = res[i].nik
                //     data.nama = res[i].nama
                //     data.alamat = res[i].alamat
                //     data.jk = res[i].jk
                //     data.umur = parseInt(res[i].umur)

                //     const {id, ...dataDummy} = data
                                    
                //     task.doc(id).set(dataDummy)
                //     .then(() => {
                //         console.log(id)
                //     })
                //     .catch((error) => {
                //         console.log(error)
                //         i = data.length + 1
                //     })

                // }

                let task = db.collection('data_pemilih')
                let item = { ...initialItem }
                item._lastUpdate = new Date()

                res.forEach((data) => {
                    item.id = 'DPT' + data.no_urut.toString().padStart(3, '0')
                    item.tipe = 'DPT'
                    item.no_urut = data.no_urut.toString().padStart(3, '0')
                    item.nik = data.nik
                    item.nama = data.nama
                    item.alamat = data.alamat
                    item.jk = data.jk
                    item.umur = parseInt(data.umur)

                    const {id, ...dataDummy} = item
                    // console.log(id, dataDummy)

                    task.doc(id).set(dataDummy)
                    .then(() => {
                        console.log(dataDummy)
                    })
                    .catch((error) => {
                        console.log(error)
                    })


                })

            })
        }
    }
}