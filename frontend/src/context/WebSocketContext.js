import { jsx as _jsx } from "react/jsx-runtime";
// frontend/src/context/WebSocketContext.tsx
import { useRef, createContext, useContext, useEffect, useState, useCallback } from 'react';
import wsService from '@/services/WebSocketService';
import { useAuth } from './UserContext';
const WebSocketContext = createContext(null);
export const WebSocketProvider = ({ children }) => {
    const { uid, displayName, status } = useAuth();
    console.log('[WebSocketContext] Dane z useAuth:', { uid, displayName, status });
    const [connected, setConnected] = useState(false);
    const lastSentStatusRef = useRef(null);
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
    const updateStatusThrottled = (status) => {
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
    const updateStatus = useCallback((newStatus) => {
        console.log('[WebSocketContext] 📤 updateStatus wywołane z argumentem:', newStatus);
        updateStatusThrottled(newStatus);
    }, [connected]);
    const sendMessage = useCallback((event, data) => {
        console.log(`[WebSocketContext] 📬 sendMessage: event="${event}"`, data);
        wsService.send(event, data);
    }, []);
    const subscribeToChannel = useCallback((channel) => {
        console.log(`[WebSocketContext] 🔔 Subskrypcja kanału: ${channel}`);
        wsService.subscribe(channel);
    }, []);
    const disconnect = useCallback(() => {
        console.log('[WebSocketContext] ❌ Ręczne rozłączenie WebSocket');
        wsService.disconnect();
        setConnected(false);
    }, []);
    const value = {
        isConnected: connected,
        updateStatus,
        sendMessage,
        subscribeToChannel,
        disconnect,
    };
    return _jsx(WebSocketContext.Provider, { value: value, children: children });
};
// Hook useWebSocket
export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket musi być używane w ramach WebSocketProvider');
    }
    return context;
};
