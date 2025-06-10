// backend/firebase/firebaseConfig.js
const admin = require('firebase-admin');
require('dotenv').config();
const serviceAccount = require('../werewolves-game-ba38e-firebase-adminsdk-fbsvc-3f085ca164.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
});

module.exports = admin;
