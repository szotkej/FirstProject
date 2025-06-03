// frontend/src/context/WebSocketContext.tsx
import React, { useRef, createContext, useContext, useEffect, useState, useCallback } from 'react';
import wsService from '@/services/WebSocketService';
import { useAuth } from './UserContext';

interface WebSocketContextType {
  isConnected: boolean;
  updateStatus: (status: string) => void;
  sendMessage: (event: string, data: any) => void;
  subscribeToChannel: (channel: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, displayName, status } = useAuth();
  console.log('[WebSocketContext] Dane z useAuth:', { uid, displayName, status });
  const [connected, setConnected] = useState(false);
  const lastSentStatusRef = useRef<string | null>(null);
  

  useEffect(() => {
    if (uid && !connected) {
      //console.log('[WebSocketContext] 🔌 Próba połączenia WebSocket jako:', displayName || 'Guest');
      wsService.onConnect = () => {
        console.log('[WebSocketContext] ✅ Połączono z WebSocket');
        setConnected(true);
        console.log(`[WebSocketContext] 📡 Subskrybujemy kanał: /player/p${uid}`);
        wsService.subscribe(`/player/p${uid}`);
        if (status) {
          console.log('[WebSocketContext] 🚀 Wysyłamy początkowy status:', status);
          updateStatusThrottled(status);
        }
      };
  
      wsService
        .connect({
          user_id: uid,
          username: displayName || 'Guest',
          credentials: 'tu-wstaw-swoje-dane-weryfikacyjne',
        })
        .catch((err) => {
          console.error('[WebSocketContext]❌ Błąd połączenia WebSocket:', err);
        });
    }
  }, [uid, displayName, connected, status]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsService.isMasterTab() && connected) {
        console.log('[WebSocketContext] 🛑 Zamykamy główną kartę – rozłączamy WebSocket');
        wsService.disconnect(); // Główna karta zamyka połączenie
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [connected]);

  const updateStatusThrottled = (status: string) => {
    if (!connected) {
      console.log('[WebSocketContext] ⚠️ Próbujemy wysłać status, ale brak połączenia:', status);
      return;
    }

    if (!['Online', 'AFK'].includes(status)) {
      console.warn('[WebSocketContext] 🚫 Niepoprawny status:', status);
      return;
    }

    if (lastSentStatusRef.current === status) {
      console.log('[WebSocketContext] ⏸️ Status już zgłoszony, pomijamy:', status);
      return;
    }

    console.log(`[WebSocketContext] 🔄 Wysyłamy status: ${status}`);
    wsService.updateStatus(status);
    lastSentStatusRef.current = status;
  };
  
  const updateStatus = useCallback((newStatus: string) => {
    console.log('[WebSocketContext] 📤 updateStatus wywołane z argumentem:', newStatus);
    updateStatusThrottled(newStatus);
  }, [connected]);
  
  const sendMessage = useCallback((event: string, data: any) => {
    console.log(`[WebSocketContext] 📬 sendMessage: event="${event}"`, data);
    wsService.send(event, data);
  }, []);
  
  const subscribeToChannel = useCallback((channel: string) => {
    console.log(`[WebSocketContext] 🔔 Subskrypcja kanału: ${channel}`);
    wsService.subscribe(channel);
  }, []);
  
  const disconnect = useCallback(() => {
    console.log('[WebSocketContext] ❌ Ręczne rozłączenie WebSocket');
    wsService.disconnect();
    setConnected(false);
  }, []);
  
  const value: WebSocketContextType = {
    isConnected: connected,
    updateStatus,
    sendMessage,
    subscribeToChannel,
    disconnect,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

// Hook useWebSocket
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket musi być używane w ramach WebSocketProvider');
  }
  return context;
};