// backend\firebase\authentication.js

import admin from './firebaseConfig';

export async function verifyIdToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Błąd weryfikacji tokena:", error);
    throw new Error("Niepoprawny token");
  }
}

