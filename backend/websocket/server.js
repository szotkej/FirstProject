// websocket/server.js
require('dotenv').config();
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Import konfiguracji Firebase, dzięki której możemy aktualizować Firestore
const admin = require('../firebase/firebaseConfig');

// Utwórz serwer WebSocket
const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 });
console.log("Serwer WebSocket działa na porcie", process.env.WS_PORT || 8080);
const channels = new Map();

function subscribe(ws, channel) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
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
  console.log(`Otrzymano pong od klienta ${this.id}`);
}

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Brak odpowiedzi od klienta ${ws.id}. Zamykam połączenie.`);
    
      // 🔻 Ustaw status na offline w Firestore
      if (ws.user?.user_id) {
        const { user_id, username } = ws.user;

        admin.firestore().collection("users").doc(user_id).update({
          status: "Offline",
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        }).then(() => {
          console.log(`📴 ${username} ustawiony jako Offline (brak odpowiedzi)`);
        }).catch((err) => {
          console.error("❌ Błąd przy ustawianiu offline (heartbeat):", err);
        });
      }
    
      // ❌ Zakończ połączenie
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  console.log('Nowe połączenie WebSocket');

  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.id = uuidv4();
  ws.verified = false;
  ws.user = {};

  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Błędny JSON:', message);
      return;
    }
    console.log(data);
    if (data.connect) {
      const { user_id, username, credentials } = data.connect.data;
      if (user_id && username && credentials) {
        ws.verified = true;
        ws.user = { user_id, username, credentials, status: 'Online' };
        const response = {
          id: data.id,
          connect: { client: ws.id, ping: 25, pong: true }
        };
        ws.send(JSON.stringify(response));
    
        // Aktualizacja statusu w Firestore
        try {
          await admin.firestore().collection("users").doc(user_id).update({
            status: "Online",
            lastSeen: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`📶 Użytkownik ${username} ustawiony jako Online`);
        } catch (error) {
          console.error("❌ Błąd przy aktualizacji statusu:", error);
        }
      } else {
        ws.send(JSON.stringify({ id: data.id, error: "Niepoprawne dane weryfikacyjne" }));
        ws.close();
      }
    } else if (!ws.verified) {
      ws.send(JSON.stringify({ id: data.id, error: "Klient niezweryfikowany" }));
      return;
    }    
    else if (data.subscribe) {
      const channel = data.subscribe.channel;
      subscribe(ws, channel);
      ws.send(JSON.stringify({ id: data.id, subscribed: channel }));
    }
    else if (data.message) {
      const { channel, text } = data.message;
      const payload = {
        from: ws.user.username,
        text,
        timestamp: new Date().toISOString()
      };
      broadcast(channel, { push: { channel, message: payload } });
    }
    // Aktualizacja statusu – rozszerzona wersja
    else if (data.status) {
      ws.user.status = data.status;
      console.log("data.status:", data.status);

      // Aktualizujemy dokument użytkownika w Firestore
      try {
        await admin.firestore().collection("users").doc(ws.user.user_id).update({
          status: data.status,
          lastSeen: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error("Błąd aktualizacji statusu w Firestore:", error);
      }

      // Opcjonalnie: rozsyłamy aktualizację statusu do subskrybentów
      const userChannel = `/player/p${ws.user.user_id}`;
      broadcast(userChannel, { push: { channel: userChannel, status: ws.user.status } });
    }
    else {
      ws.send(JSON.stringify({ id: data.id, error: "Nieznany typ wiadomości" }));
    }
  });

  ws.on('close', () => {
    console.log(`Połączenie zamknięte: ${ws.id}`);
    unsubscribe(ws);
  
    if (ws.user?.user_id) {
      // Zapamiętujemy ID użytkownika i ustawiamy timeout
      const uid = ws.user.user_id;
      const username = ws.user.username;
  
      setTimeout(async () => {
        // Sprawdzamy, czy użytkownik nadal NIE jest połączony
        const stillConnected = [...wss.clients].some(
          client => client.readyState === WebSocket.OPEN && client.user?.user_id === uid
        );
  
        if (!stillConnected) {
          try {
            await admin.firestore().collection("users").doc(uid).update({
              status: "Offline",
              lastSeen: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📴 ${username} ustawiony jako Offline (po 30s)`);
          } catch (err) {
            console.error("❌ Błąd przy ustawianiu offline:", err);
          }
        } else {
          console.log(`🔄 ${username} wrócił przed upływem 30s – nie ustawiam Offline`);
        }
      }, 30 * 1000); // 30 sekund
    }
  });
  

  ws.on('error', (error) => {
    console.error(`Błąd w połączeniu ${ws.id}:`, error);
  });
});

wss.on('close', () => {
  clearInterval(interval);
});
