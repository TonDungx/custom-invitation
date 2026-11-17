// Firebase project used for accounts (Google sign-in) and invite storage. See docs/firebase-setup.md.
// These are public identifiers, not secrets: who may read/write what is enforced by firestore.rules.
// Empty projectId = not set up yet (the admin shows the setup steps).
const FIREBASE = {
  apiKey: 'AIzaSyBOSdGiGGDkMo1jY7fJCuT5Zk8uzdlfRvQ',
  authDomain: 'custom-invitation.firebaseapp.com',
  projectId: 'custom-invitation',
  emulator: '', // tests only: host of the local Auth/Firestore emulators, e.g. '127.0.0.1'
};
