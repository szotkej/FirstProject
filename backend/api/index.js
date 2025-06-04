// backend/api/index.js

const express = require('express');
const cors = require('cors');

// Import konfiguracji Firebase z folderu firebase (backend/firebase)
const admin = require('../firebase/firebaseConfig');
const db = require('../firebase/firestore');

// Import funkcji weryfikacyjnych (także z folderu firebase)
const { verifyIdToken } = require('../firebase/authentication');

const app = express();
app.use(express.json());
app.use(cors());


// Middleware do weryfikacji tokena
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error("Brak tokena autoryzacyjnego w nagłówku");
    return res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
  }
  const token = authHeader.split('Bearer ')[1];
  //console.log("Token otrzymany przez middleware:", token);
  try { 
    const decoded = await verifyIdToken(token);
    console.log("Token zweryfikowany, dane:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Błąd weryfikacji tokena:", error);
    return res.status(401).json({ error: 'Niepoprawny token' });
  }
}

// Endpoint POST do reautoryzacji użytkownika
app.post("/api/auth/reauthenticate", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Brak UID w żądaniu" });
    }
    // Sprawdzenie, czy użytkownik istnieje (rzuci wyjątek, jeśli nie)
    await admin.auth().getUser(uid);
    // Generowanie nowego custom tokena dla użytkownika
    const customToken = await admin.auth().createCustomToken(uid);
    // Zwróć nowy custom token
    res.json({ token: customToken });
  } catch (error) {
    console.error("Błąd reautoryzacji:", error);
    res.status(500).json({ error: "Błąd reautoryzacji" });
  }
});


// Endpoint GET do pobierania profilu użytkownika
app.get('/api/profile/:uid', authenticate, async (req, res) => {
  console.log("Wywołano endpoint GET /api/profile/:uid, uid =", req.params.uid);
  try {
    const uid = req.params.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Profil użytkownika nie istnieje', uid });
    }
    console.log("pobralem profil ", userDoc.data());
    res.json(userDoc.data());
  } catch (error) {
    console.error("Błąd pobierania profilu:", error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// 🔥 Endpoint do anonimowego logowania
app.post("/api/auth/anonymous", async (req, res) => {
  try {
    //console.log("Proba logowania anonimowego");

    // Zliczanie liczby użytkowników w kolekcji 'users'
    const usersSnapshot = await db.collection("users").get();
    const userCount = usersSnapshot.size;  // Liczba użytkowników w kolekcji 'users'

    // Generowanie displayName na podstawie liczby użytkowników
    const displayName = `Guest${String(userCount + 1).padStart(4, "0")}`;

    // Tworzenie anonimowego użytkownika w Firebase Auth
    const userRecord = await admin.auth().createUser({
      displayName: displayName,
      photoURL: "https://naneno.netlify.app/assets/default_avatar.jpg"
      //photoURL: "http://localhost:5173/assets/default_avatar.jpg",
    }); 
    console.log(userRecord)
    // Generowanie tokena dla nowego użytkownika
    const token = await admin.auth().createCustomToken(userRecord.uid);
    //console.log(token)
    // Tworzenie domyślnego profilu w Firestore
    const userRef = db.collection("users").doc(userRecord.uid);
    await userRef.set({
      displayName: displayName,
      displayNameLowercase: displayName.toLowerCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      //photoURL: "http://localhost:5173/assets/default_avatar.jpg",
      photoURL: "https://naneno.netlify.app/assets/default_avatar.jpg",
      location: null,
      fontColor: "rgb(0, 0, 0)",
      birthDate: null,
      status: "Online",
    });

    res.json({ token, uid: userRecord.uid });
  } catch (error) {
    console.error("Błąd podczas logowania anonimowego:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

// Endpoint GET do wyszukiwania użytkowników po nazwie
app.get('/api/search-users', authenticate, async (req, res) => {
  const query = req.query.query?.toLowerCase();
  if (!query) {
    return res.status(400).json({ error: "Brak zapytania do wyszukania" });
  }

  try {
    console.log("Wyszukiwanie użytkowników zawierających:", query);

    const usersRef = db.collection('users');
    const snapshot = await usersRef.get(); // Pobierz wszystkie dokumenty

    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.displayNameLowercase?.includes(query)) {
        results.push({
          id: doc.id,
          displayName: data.displayName || "Unknown",
        });
      }
    });

    console.log("Znalezione wyniki:", results);
    res.json(results);
  } catch (error) {
    console.error("Błąd podczas wyszukiwania użytkowników:", error);
    res.status(500).json({ error: "Błąd serwera" });
  }
});

module.exports = app;

app.listen(3001, () => {
  console.log("Serwer działa na porcie 3001");
});