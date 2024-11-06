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
    if ( !['arisan'].includes(localStorage.getItem('stored_page')) ) {
        localStorage.setItem('stored_page', 'arisan');
        Alpine.store('page', 'arisan')
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
    initialArisan = {
        id: '',
        nama_arisan: '',
        jumlah_setor: 0,
        data_anggota: [],
        data_arisan: [],
        data_setor: [],
        pengeluaran: [],
        pemasukan: []
    }

    initialAnggota = {
        id: '',
        nama: '',
        no_hp: '',
    }

    initialArisan = {
        id: '',
        tgl_arisan: '',
        tempat_arisan: ''
    }

    initialSetor = {
        id: '',
        data_arisan_id: '',
        data_anggota_id: '',
        jumlah: 0
    }

    initialKas = {
        id: '',
        tipe: 'kredit',
        ket: '',
        jumlah: 0
    }

    return {
        isAdmin: false,

        init() {
            // auth.onAuthStateChanged(async user => {
            //     if (user) {
            //         const docID = user.uid;
            //         const userRef = firebase.firestore().collection('users').doc(docID);

            //         // Update data
            //         await userRef.set({
            //             email: user.email,
            //             displayName: user.displayName,
            //             photoURL: user.photoURL,
            //         })

            //         const rolesRef = firebase.firestore().collection('roles').doc(docID);
            //         const rolesDoc = await rolesRef.get();

            //         if (rolesDoc.exists) {
            //             Alpine.store('user_info').user = user;
            //             localStorage.setItem('stored_user', user);

            //             Alpine.store('user_info').userRole = rolesDoc.data().role;
            //             localStorage.setItem('stored_userRole', rolesDoc.data().role);

            //             this.admin = ['superadmin', 'admin_arisan'].includes(Alpine.store('user_info').userRole);
            //         } else {
            //             // Gagal login
            //             Alpine.store('message').showMessage("Login gagal : User tidak terdaftar! (Silahkan hubungi admin.)", 'error');
            //             Alpine.store('user_info').reset();
            //             auth.signOut(); 

            //             this.isAdmin = false;
            //         }
            //     }
            // })

            Alpine.store('isLoading', false)

            this.getData()
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

                this.isAdmin = false;
            }).catch((error) => {
                Alpine.store('message').showMessage('Logout failed: ' + error.message, 'error');
            });
        },

        getData() {
            Alpine.store('isLoading', false)
            db.collection('arisan').orderBy('nama_arisan').onSnapshot((snapshot) => {
                let  data = []
                data = snapshot.docs.map(doc => ({
                    id: doc.id, 
                    ...doc.data()
                }) );

                console.log(data);

                Alpine.store('isloading', false)
            }, (error) => {
                Alpine.store('message').showMessage('Error: ' + error, 'error')
                Alpine.store('isLoading', false)
            })
        }

    }
}