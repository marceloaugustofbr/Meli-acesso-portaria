import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export const authService = {
  login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  logout() {
    return signOut(auth);
  },

  onAuthChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentUser() {
    return auth.currentUser;
  },
};
