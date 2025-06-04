// src/components/GeneralChat.tsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import wsService from '../services/WebSocketService';
import ChatBox, { Message } from './ChatBox';
import { useAuth } from '../context/UserContext';

const GeneralChat: React.FC = () => {
  const location = useLocation();
  const { uid, displayName, photoURL } = useAuth(); // Pobieramy dane użytkownika z kontekstu

  // Jeśli nie jesteśmy w lobby lub użytkownik nie jest zalogowany, nie renderuj czatu
  if (location.pathname !== '/lobby' || !uid) {
    return null;
  } 

  return (
    <div>
      <h1>Chat w Lobby</h1>
    </div>
  );
};

export default GeneralChat;
