// backend\firebase\firebaseConfig.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Upewnij się, że plik istnieje

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://werewolves-game-ba38e.firebaseio.com"
});

module.exports = admin;
