 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged }
            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

        // ── PASTE YOUR FIREBASE CONFIG HERE ──
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyCBBu-UtD6PoCYmy1cPcHb-LJpa-YH6tZc",
            authDomain: "consistify-by-j4h1n.firebaseapp.com",
            projectId: "consistify-by-j4h1n",
            storageBucket: "consistify-by-j4h1n.firebasestorage.app",
            messagingSenderId: "695514845432",
            appId: "1:695514845432:web:cc0c974d462fc1f3cbab0d"
        };


        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        onAuthStateChanged(auth, user => {
            document.getElementById('loadingScreen').style.display = 'none';
            if (user) {
                window.location.href = '../../Dashboard/';
            }
        });

        window.signInWithGoogle = async () => {
            const btn = document.getElementById('googleBtn');
            const err = document.getElementById('errorMsg');
            btn.disabled = true;
            btn.style.opacity = '0.6';
            err.style.display = 'none';
            try {
                await signInWithPopup(auth, provider);
            } catch (e) {
                err.textContent = e.message || 'Sign-in failed. Please try again.';
                err.style.display = 'block';
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        };

        window.checkSharedView = () => {
            const uid = prompt('Enter the shared tracker ID:');
            if (uid && uid.trim()) window.location.href = `../../Dashboard/index.html?view=${uid.trim()}`;
        };