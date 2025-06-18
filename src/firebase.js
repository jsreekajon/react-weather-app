// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfmDRoVBHhhiO27zWO-vfmtkB2MKkND9Q",
  authDomain: "weather-31ba2.firebaseapp.com",
  databaseURL: "https://weather-31ba2-default-rtdb.firebaseio.com",
  projectId: "weather-31ba2",
  storageBucket: "weather-31ba2.firebasestorage.app",
  messagingSenderId: "229233406375",
  appId: "1:229233406375:web:59013c92957e3279308682",
  measurementId: "G-KWV1Q5JET0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
