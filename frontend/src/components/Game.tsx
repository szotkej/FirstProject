// src/components/Game.tsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import wsService from '../services/WebSocketService';
import { useAuth } from '../context/UserContext';

const Game: React.FC = () => {
  //const { uid, displayName, photoURL } = useAuth(); // Pobieramy dane użytkownika z kontekstu
  return (
    <div>
      <h1>Chat w Lobby</h1>
    </div>
  );
};

export default Game;
