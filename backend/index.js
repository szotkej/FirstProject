// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Firebase configuration
const admin = require('./firebase/firebaseConfig');
const db = require('./firebase/firestore');
const { verifyIdToken } = require('./firebase/authentication');

const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL;

// Express setup
const app = express();
app.use(express.json());
const allowedOrigins = ['http://localhost:5173', 'https://naneno.netlify.app'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Auth middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
  }
  const token = authHeader.split('Bearer ')[1];
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

// --- API endpoints ---
app.post('/api/auth/reauthenticate', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'Brak UID w żądaniu' });
    await admin.auth().getUser(uid);
    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ token: customToken });
  } catch (error) {
    console.error('Błąd reautoryzacji:', error);
    res.status(500).json({ error: 'Błąd reautoryzacji' });
  }
});

app.get('/api/profile/:uid', authenticate, async (req, res) => {
  try {
    const uid = req.params.uid;
    if (req.user.uid !== uid) return res.status(403).json({ error: 'Brak dostępu do profilu' });
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Profil użytkownika nie istnieje' });
    console.log("pobralem profil ", userDoc.data());
    res.json(userDoc.data());
  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/api/auth/anonymous', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const userCount = usersSnapshot.size;
    const displayName = `Guest${String(userCount + 1).padStart(4, '0')}`;
    const userRecord = await admin.auth().createUser({ displayName, photoURL: DEFAULT_AVATAR_URL });
    const token = await admin.auth().createCustomToken(userRecord.uid);
    await db.collection('users').doc(userRecord.uid).set({
      displayName,
      displayNameLowercase: displayName.toLowerCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      photoURL: DEFAULT_AVATAR_URL,
      location: null,
      fontColor: 'rgb(0, 0, 0)',
      birthDate: null,
      status: 'Online',
    });
    res.json({ token, uid: userRecord.uid });
  } catch (error) {
    console.error('Błąd podczas logowania anonimowego:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/search-users', authenticate, async (req, res) => {
  try {
    const query = req.query.query?.toLowerCase();
    if (!query) return res.status(400).json({ error: 'Brak zapytania do wyszukania' });
    const usersRef = db.collection('users')
      .where('displayNameLowercase', '>=', query)
      .where('displayNameLowercase', '<=', query + '\uf8ff');
    const snapshot = await usersRef.get();
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.displayNameLowercase?.includes(query)) {
        results.push({ id: doc.id, displayName: data.displayName });
      }
    });
    console.log("Znalezione wyniki:", results);
    res.json(results);
  } catch (error) {
    console.error('Błąd podczas wyszukiwania użytkowników:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket setup on same server
const wss = new WebSocket.Server({ server });
const channels = new Map();

function subscribe(ws, channel) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(ws);
}

function unsubscribe(ws) {
  for (let subs of channels.values()) subs.delete(ws);
}

function broadcast(channel, msg) {
  if (!channels.has(channel)) return;
  for (const client of channels.get(channel)) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }
}

function heartbeat() {
  this.isAlive = true;
  console.log(`↔️ Pong od klienta ${this.id}`);
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`⛔ Brak odpowiedzi od klienta ${ws.id}. Zamykam.`);
      if (ws.user?.user_id) {
        const { user_id, username } = ws.user;
        admin.firestore().collection("users").doc(user_id).update({
          status: "Offline",
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log(`📴 ${username} ustawiony jako Offline (brak odpowiedzi)`);
        }).catch(err => console.error("❌ Firestore error:", err));
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', ws => {
  console.log('🧩 Nowe połączenie WebSocket');
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.id = uuidv4();
  ws.verified = false;
  ws.user = {};

  ws.on('message', async message => {
    let data;
    try { data = JSON.parse(message); } catch { console.error('❗ Niepoprawny JSON:', message); return; }
    if (data.connect) {
      const { user_id, username, credentials } = data.connect.data;
      if (user_id && username && credentials) {
        ws.verified = true;
        ws.user = { user_id, username, credentials, status: 'Online' };
        ws.send(JSON.stringify({
          id: data.id,
          connect: { client: ws.id, ping: 25, pong: true }
        }));

        try {
          await admin.firestore().collection("users").doc(user_id).update({
            status: "Online",
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`📶 ${username} Online`);
        } catch (error) {
          console.error("❌ Firestore update error:", error);
        }
      } else {
        ws.send(JSON.stringify({ id: data.id, error: "Niepoprawne dane" }));
        ws.close();
      }
    } else if (!ws.verified) {
      ws.send(JSON.stringify({ id: data.id, error: "Niezweryfikowany klient" }));
    } else if (data.subscribe) {
      const channel = data.subscribe.channel;
      subscribe(ws, channel);
      ws.send(JSON.stringify({ id: data.id, subscribed: channel }));
    } else if (data.message) {
      const { channel, text } = data.message;
      const payload = {
        from: ws.user.username,
        text,
        timestamp: new Date().toISOString()
      };
      broadcast(channel, { push: { channel, message: payload } });
    } else if (data.status) {
      ws.user.status = data.status;
      try {
        await admin.firestore().collection("users").doc(ws.user.user_id).update({
          status: data.status,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error("❌ Firestore status update error:", error);
      }

      const userChannel = `/player/p${ws.user.user_id}`;
      broadcast(userChannel, { push: { channel: userChannel, status: data.status } });
    } else {
      ws.send(JSON.stringify({ id: data.id, error: "Nieznany typ wiadomości" }));
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Połączenie zamknięte: ${ws.id}`);
    unsubscribe(ws);

    if (ws.user?.user_id) {
      const { user_id, username } = ws.user;
      setTimeout(async () => {
        const stillConnected = [...wss.clients].some(
          client => client.readyState === WebSocket.OPEN && client.user?.user_id === user_id
        );
        if (!stillConnected) {
          try {
            await admin.firestore().collection("users").doc(user_id).update({
              status: "Offline",
              lastSeen: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📴 ${username} Offline (po 30s)`);
          } catch (err) {
            console.error("❌ Błąd przy ustawianiu offline:", err);
          }
        }
      }, 30000);
    }
  });

  ws.on('error', (err) => {
    console.error(`❌ Błąd połączenia ${ws.id}:`, err);
  });
});

wss.on('close', () => clearInterval(interval));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server + WS działa na porcie ${PORT}`);
});
