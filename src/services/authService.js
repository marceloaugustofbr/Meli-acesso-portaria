import { auth } from '../firebase';

export const authService = {
  login(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
  },

  logout() {
    return auth.signOut();
  },

  onAuthChanged(callback) {
    return auth.onAuthStateChanged(callback);
  },

  getCurrentUser() {
    return auth.currentUser;
  },
};
