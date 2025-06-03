// backend\firebase\authentication.js
const admin = require('./firebaseConfig');

async function verifyIdToken(token) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Błąd weryfikacji tokena:", error);
    throw new Error("Niepoprawny token");
  }
}

module.exports = { verifyIdToken };
