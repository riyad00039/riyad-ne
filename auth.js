// نظام المصادقة الحقيقي
class AuthService {
    constructor() {
        this.auth = null;
        this.db = null;
        this.googleProvider = null;
    }

    async init() {
        try {
            await this.loadFirebaseSDKs();
            this.setupFirebase();
            console.log('✅ Firebase جاهز');
            return true;
        } catch (error) {
            console.error('❌ خطأ في تهيئة Firebase:', error);
            return false;
        }
    }

    async loadFirebaseSDKs() {
        const loadScript = (src) => {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        await Promise.all([
            loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
            loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
            loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
    }

    setupFirebase() {
        if (!firebase || !firebase.initializeApp) {
            throw new Error('Firebase SDK لم يتم تحميله');
        }

        const app = firebase.initializeApp(window.firebaseConfig);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.googleProvider = new firebase.auth.GoogleAuthProvider();
        
        window.firebase = { app, auth: this.auth, db: this.db, googleProvider: this.googleProvider };
    }

    async registerWithEmail(username, email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.updateProfile({ displayName: username });
            
            await this.saveUserData(user.uid, {
                username: username,
                email: email,
                displayName: username,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                favorites: [],
                watchHistory: [],
                watchList: [],
                profileImage: '',
                role: 'user'
            });
            
            return { success: true, user };
            
        } catch (error) {
            throw this.getAuthErrorMessage(error);
        }
    }

    async loginWithEmail(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            await this.updateUserLoginTime(userCredential.user.uid);
            return { success: true, user: userCredential.user };
        } catch (error) {
            throw this.getAuthErrorMessage(error);
        }
    }

    async loginWithGoogle() {
        try {
            const result = await this.auth.signInWithPopup(this.googleProvider);
            const user = result.user;
            
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                await this.saveUserData(user.uid, {
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    displayName: user.displayName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    favorites: [],
                    watchHistory: [],
                    watchList: [],
                    profileImage: user.photoURL || '',
                    role: 'user'
                });
            } else {
                await this.updateUserLoginTime(user.uid);
            }
            
            return { success: true, user };
            
        } catch (error) {
            throw this.getAuthErrorMessage(error);
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    async saveUserData(uid, data) {
        await this.db.collection('users').doc(uid).set(data, { merge: true });
    }

    async updateUserLoginTime(uid) {
        await this.db.collection('users').doc(uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    async getUserData(uid) {
        const userDoc = await this.db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data();
        }
        return null;
    }

    getAuthErrorMessage(error) {
        const messages = {
            'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
            'auth/invalid-email': 'البريد الإلكتروني غير صالح',
            'auth/weak-password': 'كلمة المرور ضعيفة جداً',
            'auth/user-not-found': 'البريد الإلكتروني غير مسجل',
            'auth/wrong-password': 'كلمة المرور غير صحيحة',
            'auth/too-many-requests': 'تم تجاوز عدد المحاولات، حاول لاحقاً',
            'auth/network-request-failed': 'خطأ في الاتصال بالشبكة'
        };
        
        return messages[error.code] || 'حدث خطأ غير معروف';
    }
}

window.authService = new AuthService();