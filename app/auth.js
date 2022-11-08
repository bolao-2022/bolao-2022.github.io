import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.13.0/firebase-app.js';
import { getAuth, signOut, getRedirectResult, signInWithPopup, signInWithRedirect, onAuthStateChanged, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/9.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyCj45oWIMWQE0zKfqPyzHxUwJyoRHFj-2k",
  authDomain: "bolao-2022.firebaseapp.com",
  projectId: "bolao-2022",
  storageBucket: "bolao-2022.appspot.com",
  messagingSenderId: "820186352365",
  appId: "1:820186352365:web:29ad29ffb89ffd97ac9ae4",
  measurementId: "G-TT9JL0X37Z"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
auth.languageCode = 'pt';
const provider = new GoogleAuthProvider(firebaseApp);

export function watch_login_status(user_logged_in, user_logged_out) {
    onAuthStateChanged(auth, user => {
        if (user !== null) {
            console.log(`user logged in: ${user.email}`);
            window.user = user;
            user_logged_in(user);
        } else {
            console.log("user logged out");
            user_logged_out(user);
        }
    });
}

export function login() {
    //signInWithRedirect(auth, provider);
    signInWithPopup(auth, provider);
}

export function logout() {
    return new Promise(async function(resolve, reject) {
        try {
            await signOut(auth);
            resolve();
        } catch (error) {
            reject();
        }
    });
}
