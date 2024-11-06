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
    if ( !['kas p2g', 'user page'].includes(localStorage.getItem('stored_page')) ) {
        localStorage.setItem('stored_page', 'kas p2g');
        Alpine.store('page', 'kas p2g')
    } else {
        Alpine.store('page', localStorage.getItem('stored_page'))
    }

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
});

function ndrtApp() {
    return {
        doCRUD: false,

        init() {
            auth.onAuthStateChanged(async user => {
                if (user) {
                    const docID = user.uid;
                    const userRef = firebase.firestore().collection('users').doc(docID);

                    // Update data
                    await userRef.set({
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    })

                    const rolesRef = firebase.firestore().collection('roles').doc(docID);
                    const rolesDoc = await rolesRef.get();

                    if (rolesDoc.exists) {
                        Alpine.store('user_info').user = user;
                        localStorage.setItem('stored_user', user);

                        Alpine.store('user_info').userRole = rolesDoc.data().role;
                        localStorage.setItem('stored_userRole', rolesDoc.data().role);

                        this.doCRUD = ['superadmin', 'admin'].includes(Alpine.store('user_info').userRole);
                    } else {
                        // Gagal login
                        Alpine.store('message').showMessage("Login gagal : User tidak terdaftar! (Silahkan hubungi admin.)", 'error');
                        Alpine.store('user_info').reset();
                        auth.signOut(); 

                        this.doCRUD = false;
                    }
                }
            })

            Alpine.store('isLoading', false);
        },

        // page
        switchPage(x_page) {
            Alpine.store('page', x_page);
            localStorage.setItem('stored_page', x_page);
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

                this.doCRUD = false;
            }).catch((error) => {
                Alpine.store('message').showMessage('Logout failed: ' + error.message, 'error');
            });
        },

    }
}

function kasP2g() {
    const initialKas = {
        tanggal: '',
        ket: '',
        type: 'debit',
        jumlah: '' 
    }

    return {
        // prop
        form: false,

        // kas P2g
        filterTanggal: '',
        kasList: [],
        newKas: { ...initialKas },

        init() {
            if (Alpine.store('page') !== 'kas p2g') return;

            this.readKas();
            const filterDate = new Date().setMonth(0,1);
            this.filterTanggal = this.formatDate(filterDate);
            this.newKas.tanggal = this.formatDate();
        },

        // PROP KAS
        formatDate(date = '') {
            const d = date === '' ? new Date() : new Date(date);
            // const d = new Date(date)
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        viewDate(date, option = 's'){
            let q = { day: '2-digit', month: '2-digit', year: '2-digit' };
            q = option === 's' ? q : { day: 'numeric', month: 'long', year: 'numeric' }

            return new Date(date).toLocaleDateString('id-ID', q);
        },

        formatRupiah(input) {
            // Remove any non-numeric characters
            // let value = input.value.replace(/[^,\d]/g, '');
            // Allow for a leading minus sign and remove any non-numeric characters except the minus sign
            let value = input.value.replace(/(?!^-)[^,\d]/g, ''); 
        
            if (value === '') {
                input.value = ''; // If the input is empty, return
                return;
            }
        
            // Convert the value to an integer for formatting
            let numericValue = parseInt(value.replace(/,/g, ''));
            if (isNaN(numericValue)) return;
        
            // Format the value as Rupiah
            let formattedValue = new Intl.NumberFormat('id-ID').format(numericValue);
        
            input.value = formattedValue;
        },

        formatInteger(formattedString) {
            // Check if the string contains a minus sign at the beginning
            const isNegative = formattedString.startsWith('-');
        
            // Remove any non-numeric characters except for commas and periods
            const cleanedString = formattedString.replace(/[^0-9]/g, '');
        
            // Convert the cleaned string to an integer
            let integerValue = parseInt(cleanedString, 10);
        
            // If the original string was negative, multiply the integer value by -1
            if (isNegative) {
                integerValue *= -1;
            }
        
            return integerValue;
        },
        
        viewRupiah(ini) {
            let formattedValue = new Intl.NumberFormat('id-ID').format(ini);
            return formattedValue;
        },

        // CRUD KAS P2G
        resetForm() {
            this.form = false;
            this.newKas = { ...initialKas };
            this.newKas.tanggal = this.formatDate();

            this.form = false;
            history.pushState(null, '', '');
            document.documentElement.classList.remove('is-clipped');
        },

        openForm(kas) {
            const doCRUD = ['superadmin', 'admin'].includes(Alpine.store('user_info').userRole);
            if (!doCRUD) return;

            if (kas) {
                this.newKas = { ...kas };
                this.newKas.jumlah = this.viewRupiah(this.newKas.jumlah);
                this.newKas.tanggal = this.formatDate(new Date(this.newKas.tanggal))
            }

            this.form = true;
            document.documentElement.classList.add('is-clipped');

            // Listen for the back button press
            history.pushState(null, '', '');
            window.addEventListener('popstate', () => { this.resetForm(); });
        },

        saveKas() {
            if (!this.newKas.tanggal || !this.newKas.type || !this.newKas.ket || !this.newKas.jumlah) {
                Alpine.store('message').showMessage('Please fill all fields', 'error');
                return;
            }

            if ( !this.newKas.id ) {
                this.createKas();
            } else {
                this.updateKas();
            }
        },

        createKas() {
            Alpine.store('isLoading', true);
            db.collection('kas').add({
                tanggal: new Date(this.newKas.tanggal),
                type: this.newKas.type,
                ket: this.newKas.ket,
                jumlah: this.formatInteger(this.newKas.jumlah),
                // createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                this.resetForm();
                Alpine.store('message').showMessage('Tambah data berhasil');
            }).catch((error) => {
                Alpine.store('message').showMessage('Error: ' + error.message, 'error');
            }).finally(() => {
                Alpine.store('isLoading', false);
            });
        },

        updateKas() {
            Alpine.store('isLoading', true);
            db.collection('kas').doc(this.newKas.id).update({
                tanggal: new Date(this.newKas.tanggal),
                type: this.newKas.type,
                ket: this.newKas.ket,
                jumlah: this.formatInteger(this.newKas.jumlah),
            }).then(() => {
                Alpine.store('message').showMessage('Update data berhasil');
                this.resetForm();
            }).catch((error) => {
                Alpine.store('message').showMessage('Error: ' + error.message, 'error');
            }).finally(() => {
                Alpine.store('isLoading', false);
            });
        },

        deleteKas(kas) {
            if (confirm("Hapus data ?")){
                Alpine.store('isLoading', true);
                db.collection('kas').doc(kas.id).delete().then(() => {
                    this.resetForm();
                    Alpine.store('message').showMessage('Hapus data berhasil');
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
            }
        },

        // read data
        readKas() {
            Alpine.store('isLoading', true);
            db.collection('kas').orderBy('tanggal', 'asc').onSnapshot((snapshot) => {
                this.kasList = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    tanggal: doc.data().tanggal.toDate() 
                }));
                Alpine.store('isLoading', false);
            }, (error) => {
                Alpine.store('message').showMessage('Error fetching data: ' + error.message, 'error');
                Alpine.store('isLoading', false);
            });
        },

        filterKas() {
            const newDate = new Date(this.filterTanggal);
            // newDate.setMonth(newDate.getMonth() - 1);
            // newDate.setDate(1);
            newDate.setFullYear(newDate.getFullYear() - 1, 0, 1);
            this.filterTanggal = this.formatDate(newDate);
        },

        get totalDebit() {
            return this.filteredDebitKasList.reduce((sum, kas) => sum + kas.jumlah, 0);
        },

        get totalKredit() {
            return this.filteredKreditKasList.reduce((sum, kas) => sum + kas.jumlah, 0);
        },

        get filteredKasList() {
            if (!this.filterTanggal) return this.kasList;

            const filterDate = new Date(this.filterTanggal);
            return this.kasList.filter(kas => new Date(kas.tanggal) >= filterDate);
        },

        get filteredDebitKasList() {
            return this.filteredKasList.filter(kas => kas.type === 'debit');
        },

        get filteredKreditKasList() {
            return this.filteredKasList.filter(kas => kas.type === 'kredit');
        },

        get totalBeforeFilter() {
            if (!this.filterTanggal) return 0;
            const filterDate = new Date(this.filterTanggal);
            
            const debit =  this.kasList
                .filter(kas => kas.type === 'debit' && new Date(kas.tanggal) < filterDate)
                .reduce((sum, kas) => sum + kas.jumlah, 0);

            const kredit =  this.kasList
                .filter(kas => kas.type === 'kredit' && new Date(kas.tanggal) < filterDate)
                .reduce((sum, kas) => sum + kas.jumlah, 0);

            return debit - kredit;
        },        

        // generatePDF
        printPDF() {
            const doCRUD = ['superadmin', 'admin'].includes(Alpine.store('user_info').userRole);
            if (!doCRUD) return;

            const doPrint = confirm("Eksport data ke PDF ?")
            if (!doPrint) return;

            const options = { day: '2-digit', month: '2-digit', year: '2-digit' };

            let tableHeader = [
                [
                    { content: 'NO', styles: { halign: 'center' } },
                    { content: 'TANGGAL', styles: { halign: 'center' } },
                    { content: 'KETERANGAN', styles: { halign: 'center' } },
                    { content: 'JUMLAH', styles: { halign: 'center' } },
                ]
            ]

            let tablePemasukan = []
            
            // saldo sebelum
            let saldoSebelum = this.totalBeforeFilter > 0 ? [
                { content: 1, styles: { halign: 'center' } },
                this.viewDate(this.filterTanggal, 's'),
                'SALDO KAS P2G per ' + this.viewDate(this.filterTanggal, 'l'),
                { content: this.totalBeforeFilter.toLocaleString('id-ID'), styles: { halign: 'right' } },
            ] : [];

            // Create table data for table Pemasukan
            tablePemasukan = this.filteredDebitKasList.map((res, index) => [
                { content: index + (this.totalBeforeFilter > 0 ? 2 : 1), styles: { halign: 'center' } },
                { content: new Date(res['tanggal']).toLocaleDateString('id-ID', options) },
                res['ket'],
                { content: res['jumlah'].toLocaleString('id-ID'), styles: { halign: 'right' } },
            ]);

            // push saldo sebelum
            if ( this.totalBeforeFilter > 0 ) { tablePemasukan.unshift(saldoSebelum) }

            // jika pemasukan null
            if (tablePemasukan.length <= 0) {
                tablePemasukan = [
                    [{ content: 'TIDAK ADA PEMASUKAN', colSpan:4, styles: { halign: 'center' } }]
                ];
            }

            let tablePengeluaran = []
            if (this.filteredKreditKasList.length > 0) {
                // Table Pengeluaran
                tablePengeluaran = this.filteredKreditKasList.map((res, index) => [
                    { content: index + 1, styles: { halign: 'center' } },
                    { content: new Date(res['tanggal']).toLocaleDateString('id-ID', options) },
                    res['ket'],
                    { content: res['jumlah'].toLocaleString('id-ID'), styles: { halign: 'right' } },
                ]);
            } else {
                tablePengeluaran = [
                    [{ content: 'TIDAK ADA PENGELUARAN', colSpan:4, styles: { halign: 'center' } }]
                ];
            }



            const paraf = [
                [
                    { content: '', styles: { halign: 'center' } },
                    { content: new Date().toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), styles: { halign: 'center' } },
                ],
                [
                    { content: 'Bendahara', styles: { halign: 'center' } },
                    { content: 'Ketua', styles: { halign: 'center' } },
                ],
                [
                    { content: '\r\n\r\n\r\n\r\n\r\n(                                                       )', styles: { halign: 'center' } },
                    { content: '\r\n\r\n\r\n\r\n\r\n(                                                       )', styles: { halign: 'center' } },
                ]
            ]

            // Access jsPDF from the UMD bundle
            const { jsPDF } = window.jspdf;
            // Create a new jsPDF document
            const doc = new jsPDF();

            // 1. Add a Page Title
            doc.setFontSize(16); // Set title font size
            doc.text('LAPORAN KAS PEMUDA-PEMUDI GADEN \r\n TAHUN '+ new Date().toLocaleDateString("id-ID", { year: 'numeric' }), doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            // pemasukan
            doc.setFontSize(12);
            doc.text('1. Pemasukan', 14, 40)

            // table pemasukan
            doc.autoTable({
                startY: 45,
                theme: 'grid',
                head: tableHeader,
                body: tablePemasukan,
                tableWidth: 'auto',
                rowPageBreak: 'avoid',
                styles: {
                    fontSize: 12,
                }
            })

            // pengeluaran
            doc.setFontSize(12);
            doc.text('2. Pengeluaran', 14, doc.lastAutoTable.finalY + 20)

            // table pemasukan
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 25,
                theme: 'grid',
                head: tableHeader,
                body: tablePengeluaran,
                tableWidth: 'auto',
                rowPageBreak: 'avoid',
                styles: {
                    fontSize: 12,
                }
            })

            // total saldo
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('SALDO AKHIR      :       ' + ((this.totalBeforeFilter + this.totalDebit) - this.totalKredit).toLocaleString('id-ID'),
                doc.internal.pageSize.getWidth() - 14, doc.lastAutoTable.finalY + 15, { align: 'right' }
            )

            // Paraf
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 30,
                theme: 'plain', // 'striped', 'grid' or 'plain'
                body: paraf,
                tableWidth: 'auto', // Ensure the table fits within the page
                pageBreak: 'avoid',
                styles: {
                    fontSize: 12,
                    lineWidth: 0, // Set border width to 0 to hide borders
                    fillColor: null,   // Remove background color
                },
                // margin: { top: 15, left: 25, right: 25 }, // Add margins
            });

            // 4. Add a footer with page number (optional)
            let pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.setFont('helvetica', 'italic')

                doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, 
                    { align: 'right' }
                );

                doc.text('Dibuat tanggal ' + new Date().toLocaleDateString('id-ID', options), 14, doc.internal.pageSize.getHeight() - 10, 
                    { align: 'left' }
                );
            }

            // Save the PDF
            doc.save('Laporan KAS P2G ('+ new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +').pdf');
            
        }

    }
}

function userPage() {
    return {
        // user
        userList: [],
        rolEdit: {},

        init() {
            if (Alpine.store('page') !== 'user page') return;
            if (Alpine.store('user_info').userRole !== 'superadmin') return;
            this.readUsers();
        },

        // Page User
        readUsers() {
            Alpine.store('isLoading', true);
            db.collection('users').onSnapshot(async (userSnapshot) => {
                try {
                    const roleSnapshot = await db.collection('roles').get();
                    const roleMap = {};

                    roleSnapshot.forEach(i => {
                        roleMap[i.id] = i.data().role
                    });

                    this.userList = userSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        role: roleMap[doc.id] || 'null'
                    }));

                } catch (error) {
                    Alpine.store('message').showMessage('Error fetching data: ' + error.message, 'error');
                    Alpine.store('isLoading', false);
                }
                Alpine.store('isLoading', false);
            }, (error) => {
                Alpine.store('message').showMessage('Error fetching data: ' + error.message, 'error');
                Alpine.store('isLoading', false);
            })
        },

        ubahRole(i) {
            if (confirm("Ubah role "+ i.displayName + "?")) {
                Alpine.store('isLoading', true);
                const rolesRef = db.collection('roles').doc(i.id);

                rolesRef.set({
                    email: i.email,
                    role: i.role
                }).then(() => {
                    Alpine.store('message').showMessage('Update data berhasil');
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false);
                });
    
            }
        },

        hapusUser(i) {
            if (confirm("Hapus data "+ i.displayName +" ?")){
                Alpine.store('isLoading', true);

                db.collection('roles').doc(i.id).delete().then(() => {
                    db.collection('users').doc(i.id).delete().then(() => {
                        Alpine.store('message').showMessage('Hapus data berhasil');
                    })
                }).catch((error) => {
                    Alpine.store('message').showMessage('Error: ' + error.message, 'error');
                }).finally(() => {
                    Alpine.store('isLoading', false)
                })
            }
        }
    }
}