// src/components/GeneralChat.tsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import wsService from '../services/WebSocketService';
import ChatBox, { Message } from './ChatBox';
import { useAuth } from '../context/UserContext';

const GeneralChat: React.FC = () => {
  const location = useLocation();
  const { uid, username, avatar } = useAuth(); // Pobieramy dane użytkownika z kontekstu

  // Jeśli nie jesteśmy w lobby lub użytkownik nie jest zalogowany, nie renderuj czatu
  if (location.pathname !== '/lobby' || !uid) {
    return null;
  }

  // Przygotuj dynamiczny obiekt użytkownika dla wsService
  const userForWS = {
    user_id: uid, // np. "MJr6iIwnP9PqUiAq42ziXfJ69AP2"
    username: username || "Nieznany",
    credentials: uid, // Jeśli nie masz oddzielnego tokenu, możesz użyć uid lub innego tokenu
    avatar: avatar || "/assets/default_avatar.jpg"
  };

  useEffect(() => {
    wsService.connect(userForWS)
      .then(() => {
        wsService.subscribe('/chat/general');
      })
      .catch((error) => {
        console.error('Błąd podczas łączenia WebSocket:', error);
      });

    return () => {
      wsService.disconnect();
    };
  }, [uid]);

  // Funkcja wysyłająca wiadomość przez wsService
  const handleSendMessage = (text: string) => {
    wsService.sendMessage('/chat/general', text);
  };

  return (
    <div>
      <h1>Chat w Lobby</h1>
      <ChatBox userAvatar={userForWS.avatar} onSendMessage={handleSendMessage} />
    </div>
  );
};

export default GeneralChat;
