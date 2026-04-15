// TODO: Replace with your actual Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAMpRYbvGzUJzg-JoBPr4mGQGpW-Bthhcw",
    authDomain: "kootugaana.firebaseapp.com",
    databaseURL: "https://kootugaana-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kootugaana",
    storageBucket: "kootugaana.firebasestorage.app",
    messagingSenderId: "668038794870",
    appId: "1:668038794870:web:b7436741f5b0dd8d48d957",
    measurementId: "G-CV2K93QRNL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const analytics = firebase.analytics();
const firestore = firebase.firestore();

// Detect Localhost and use Emulators
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.log("Using Firebase Emulators");
    // Explicitly disable live calls for Auth if emulator is used properly
    database.useEmulator("localhost", 9000);
    auth.useEmulator("http://localhost:9099");
    firestore.useEmulator("localhost", 8080);
    // Analytics doesn't have a specific emulator method in JS SDK usually, 
    // but events will be logged.
} else {
    console.log("Using Live Firebase Backend");
}