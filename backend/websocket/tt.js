// websocket/server.js
require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const admin = require('../firebase/firebaseConfig');

// 🌍 Ustaw port: Railway daje process.env.PORT, lokalnie użyj 8080
const PORT = process.env.PORT || 8080;

// 🔌 Stwórz serwer HTTP (nie trzeba obsługiwać żadnych endpointów)
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket server is running");
});

// 🎯 Zainicjalizuj WebSocket na tym serwerze
const wss = new WebSocket.Server({ server });
console.log(`✅ WebSocket nasłuchuje na porcie ${PORT}`);

// 📡 Uruchom HTTP serwer (wymagane przez Railway)
server.listen(PORT, () => {
  console.log(`🌐 HTTP/WebSocket serwer działa na porcie ${PORT}`);
});

const channels = new Map();

function subscribe(ws, channel) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(ws);  
}

function unsubscribe(ws) {
  for (let subscribers of channels.values()) {
    subscribers.delete(ws);
  }
}

function broadcast(channel, message) {
  if (channels.has(channel)) {
    for (const client of channels.get(channel)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
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

// 🔌 Obsługa połączeń WebSocket
wss.on('connection', (ws) => {
  console.log('🧩 Nowe połączenie WebSocket');

  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.id = uuidv4();
  ws.verified = false;
  ws.user = {};

  ws.on('message', async (message) => {
    let data;
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
