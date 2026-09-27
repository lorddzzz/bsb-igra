import type { FirebaseOptions } from 'firebase/app'

// Web app config from the Firebase console.
// It is not a secret: it ships to every browser, and database.rules.json is what protects the data.
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyDLGkLfGlJhBTKYwo07d9NVKW35-Vq9ZU8',
  authDomain: 'bsb-igra.firebaseapp.com',
  databaseURL: 'https://bsb-igra-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'bsb-igra',
  storageBucket: 'bsb-igra.firebasestorage.app',
  messagingSenderId: '970807538263',
  appId: '1:970807538263:web:665eeaa06d7971193b2912',
}
