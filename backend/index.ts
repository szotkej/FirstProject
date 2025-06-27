// backend\index.ts

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration
import admin from './firebase/firebaseConfig';
import db from './firebase/firestore';
import { verifyIdToken } from './firebase/authentication';

import { firestore } from 'firebase-admin';

const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL;

interface User {
  uid: string;
  displayName: string;
  displayNameLowercase: string;
  createdAt: firestore.FieldValue;
  lastSeen: firestore.FieldValue;
  photoURL: string;
  location: string | null;
  fontColor: string;
  birthDate: string | null;
  status: string;
  userDescription: string;
}

type CustomWebSocket = WebSocket & {
  id: string;
  isAlive: boolean;
  verified: boolean;
  user?: {
    user_id: string;
    username: string;
    credentials: string;
    status: string;
  };
};


// Express setup
const app = express();
app.use(express.json());

const allowedOrigins = ['http://localhost:5173', 'https://naneno.netlify.app'];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Auth middleware
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Brak tokena autoryzacyjnego' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await verifyIdToken(token);
    console.log("Token zweryfikowany, dane:", decoded);
    (req as any).user = decoded;
    next();
  } catch (error) {
    console.error("Błąd weryfikacji tokena:", error);
    return res.status(401).json({ error: 'Niepoprawny token' });
  }
}

// --- API endpoints ---
app.post('/api/auth/reauthenticate', async (req: Request, res: Response) => {
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

app.get('/api/profile/:uid', authenticate, async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Profil użytkownika nie istnieje' });
    console.log("pobralem profil ", userDoc.data());
    res.json(userDoc.data());
  } catch (error) {
    console.error('Błąd pobierania profilu:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.post('/api/auth/anonymous', async (req: Request, res: Response) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const userCount = usersSnapshot.size;
    const displayName = `Guest${String(userCount + 1).padStart(4, '0')}`;
    const userRecord = await admin.auth().createUser({ displayName, photoURL: DEFAULT_AVATAR_URL });
    const token = await admin.auth().createCustomToken(userRecord.uid);

    const newUser: User = {
      uid: userRecord.uid,
      displayName,
      displayNameLowercase: displayName.toLowerCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      photoURL: DEFAULT_AVATAR_URL || '',
      location: null,
      fontColor: 'rgb(0, 0, 0)',
      birthDate: null,
      status: 'Online',
      userDescription: '',
    };

    await db.collection('users').doc(userRecord.uid).set(newUser);

    res.json({ token, uid: userRecord.uid });
  } catch (error) {
    console.error('Błąd podczas logowania anonimowego:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.get('/api/search-users', authenticate, async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string)?.toLowerCase();
    if (!query) return res.status(400).json({ error: 'Brak zapytania do wyszukania' });

    const usersRef = db.collection('users')
      .where('displayNameLowercase', '>=', query)
      .where('displayNameLowercase', '<=', query + '\uf8ff');

    const snapshot = await usersRef.get();
    const results: { id: string; displayName: string }[] = [];

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

app.put('/api/profile/:uid', authenticate, async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const updates = req.body;

    if (updates.displayName) {
      if (updates.displayName.length < 4) {
        return res.status(400).json({ error: 'Nazwa użytkownika musi mieć co najmniej 4 znaki' });
      }

      const displayNameLower = updates.displayName.toLowerCase();
      const existingUsers = await db.collection('users')
        .where('displayNameLowercase', '==', displayNameLower)
        .get();

      if (!existingUsers.empty) {
        const isCurrentUser = existingUsers.docs.some(doc => doc.id === uid);
        if (!isCurrentUser) {
          return res.status(400).json({ error: 'Nazwa użytkownika jest już zajęta' });
        }
      }

      updates.displayNameLowercase = displayNameLower;
    }

    updates.lastSeen = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(uid).update(updates);

    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (updates.displayName) authUpdates.displayName = updates.displayName;
    if (updates.photoURL) authUpdates.photoURL = updates.photoURL;

    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(uid, authUpdates);
    }

    console.log(`✅ Zaktualizowano profil użytkownika ${uid}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Błąd podczas aktualizacji profilu:', error);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket setup on same server
const wss = new WebSocketServer({ server });
const channels: Map<string, Set<CustomWebSocket>> = new Map();

function subscribe(ws: CustomWebSocket, channel: string) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel)!.add(ws);
}

function unsubscribe(ws: CustomWebSocket) {
  for (let subs of channels.values()) {
    subs.delete(ws);
  }
}

function broadcast(channel: string, msg: any) {
  if (!channels.has(channel)) return;
  for (const client of channels.get(channel)!) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }
}

function heartbeat(ws: CustomWebSocket) {
  ws.isAlive = true;
  console.log(`↔️ Pong od klienta ${ws.id}`);
}

const interval = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as CustomWebSocket;
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

wss.on('connection', (client: WebSocket) => {
  const ws = client as CustomWebSocket;
  console.log('🧩 Nowe połączenie WebSocket');
  ws.isAlive = true;
  ws.on('pong', () => heartbeat(ws)); 
  ws.id = uuidv4();
  ws.verified = false;
  ws.user = undefined;

  ws.on('message', async (message: string) => {
    let data: any;

    try {
      data = JSON.parse(message);
    } catch {
      console.error('❗ Niepoprawny JSON:', message);
      return;
    }

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
        from: ws.user!.username,
        text,
        timestamp: new Date().toISOString()
      };
      broadcast(channel, { push: { channel, message: payload } });
    } else if (data.status) {
      ws.user!.status = data.status;

      try {
        await admin.firestore().collection("users").doc(ws.user!.user_id).update({
          status: data.status,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error("❌ Firestore status update error:", error);
      }

      const userChannel = `/player/p${ws.user!.user_id}`;
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
        const stillConnected = Array.from(wss.clients).some((client) => {
          const c = client as CustomWebSocket;
          return c.readyState === WebSocket.OPEN && c.user?.user_id === user_id;
        });

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

// Middleware do obsługi błędów Multera (NA KOŃCU)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Coś poszło nie tak!' });
});

const PORT = process.env.PORT || 3001; // Użyj PORT z Railway, domyślnie 3001 lokalnie
server.listen(PORT, () => {
  console.log(`Server + WS działa na porcie ${PORT}`); // Zaktualizuj log
});
