// src/services/authService.js
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from './firebase';

// configurar persistencia, la sesión se mantendrá incluso si se cierra el navegador
export const enablePersistence = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence); // guarda sesión en el navegador
  } catch (e) {
    console.error('No se pudo establecer persistencia:', e);
  }
};

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const onAuthChange = (callback) =>
  onAuthStateChanged(auth, callback);
