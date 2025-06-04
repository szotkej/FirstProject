// frontend\src\services\WebSocketService.ts

import { BroadcastChannel } from 'broadcast-channel';

class WebSocketService {
  private socket: WebSocket | null = null;
  private channel: BroadcastChannel | null = null;
  private isMaster: boolean = false;
  public isConnected: boolean = false;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private INACTIVITY_LIMIT = 20 * 60 * 1000; // 15 minuta
  private localStatus: string = 'Online'; // Lokalny status dla każdej karty
  private lastSentStatus: string = 'Online'; // Ostatni wysłany status (tylko dla master)
  private cleanupActivityTracking?: () => void;
  private tabsStatus: Map<string, string> = new Map();
  private tabId: string;
  private masterCheckTimeout?: NodeJS.Timeout;
  private pendingConnectConfig?: { user_id: string; username: string; credentials: string };
  private knownTabs = new Set<string>();
  private pendingSubscriptions: string[] = [];

  constructor() {
    this.tabId = Date.now().toString() + Math.random().toString(36).slice(2);
    console.log(`[WebSocketService] Initialized tabId=${this.tabId}, isMaster=${this.isMaster}`);
    this.knownTabs.add(this.tabId);
    this.channel = new BroadcastChannel('websocket_channel');
    this.channel.onmessage = this.handleChannelMessage.bind(this);
    this.sendBroadcastMessage({ type: 'ANNOUNCE' });
    this.checkMaster();
    this.initActivityTracking();
    this.startInactivityTimer();
    window.addEventListener('pagehide', () => {
      if (this.isMaster) {
        console.log('[WebSocketService] pagehide: master is leaving, broadcasting MASTER_CLOSED');
        localStorage.removeItem('masterId');
        this.sendBroadcastMessage({ type: 'MASTER_CLOSED', closedTabId: this.tabId });
      } else {
        this.sendBroadcastMessage({ type: 'NOT_MASTER_CLOSED', closedTabId: this.tabId });
      }
    });
    window.addEventListener('unload', () => {
      localStorage.removeItem('masterId');
      this.sendBroadcastMessage({ type: 'TAB_CLOSED', tabId: this.tabId });
    });
    
  }

  public sendBroadcastMessage(message: any) {
    console.log('[sendBroadcastMessage] 📤', message, `from tabId=${this.tabId}`); 
    this.channel?.postMessage({ ...message, tabId: this.tabId });
  }

  public updateStatus(status: string) {
    if (this.localStatus !== status) {
      console.log(`[updateStatus] 🔄 Ustawiamy localStatus na "${status}" dla tabId: ${this.tabId}`);
      this.localStatus = status;
      if (this.isMaster) {
        this.tabsStatus.set(this.tabId, status);
        this.determineAndSendStatus();
      } else {
        this.sendBroadcastMessage({ type: 'STATUS_UPDATE', status });
      }
    } else {
      console.log(`[updateStatus] ⏸️ Status "${status}" już ustawiony lokalnie – pomijamy`);
    }
  }

  public resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    const newStatus = 'Online';
    if (this.localStatus !== newStatus) {
      this.localStatus = newStatus;
      if (this.isMaster) {
        this.tabsStatus.set(this.tabId, newStatus);
        this.determineAndSendStatus();
      } else {
        this.sendBroadcastMessage({ type: 'STATUS_UPDATE', status: newStatus });
      }
    }
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    this.inactivityTimer = setTimeout(() => {
      const newStatus = 'AFK';
      if (this.localStatus !== newStatus) {
        this.localStatus = newStatus;
        if (this.isMaster) {
          this.tabsStatus.set(this.tabId, newStatus);
          this.determineAndSendStatus();
        } else {
          this.sendBroadcastMessage({ type: 'STATUS_UPDATE', status: newStatus });
        }
      }
    }, this.INACTIVITY_LIMIT);
  }

  private determineAndSendStatus() {
    const statuses = Array.from(this.tabsStatus.values());
    let statusToSend: string;
    if (statuses.includes('Online')) {
      statusToSend = 'Online';
    }
    else if (statuses.every(s => s === 'AFK')) {
      statusToSend = 'AFK';
    }
    else {
      console.warn('[determineAndSendStatus] ⚠️ Nieznany stan statusów:', statuses);
      return;
    }

    // Wysyłamy status tylko, jeśli różni się od ostatniego wysłanego
    if (this.lastSentStatus !== statusToSend) {
      const allTabsStatus = Array.from(this.tabsStatus.values());
      console.log('[determineAndSendStatus] Wartości statusów:', allTabsStatus);  
      console.log(`[determineAndSendStatus] 📤 Wysyłamy status "${statusToSend}" do serwera`);
      this.sendRaw({ status: statusToSend, id: Date.now() });
      this.lastSentStatus = statusToSend;
    } else {
      console.log(`[determineAndSendStatus] ⏸️ Status "${statusToSend}" już wysłany wcześniej – pomijamy`);
    }
  }

  public onConnect: (() => void) | null = null;

  public isMasterTab(): boolean {
    return this.isMaster;
  }

  private checkMaster() {
    const storedMasterId = localStorage.getItem('masterId');
    
    if (!storedMasterId) {
      // Brak zapisu w localStorage
      console.log('[checkMaster] No masterId in localStorage');
      this.sendBroadcastMessage({ type: 'CHECK_MASTER' });
      this.masterCheckTimeout = setTimeout(() => {
        if (!this.isMaster) {
          console.log('[checkMaster] No master found within timeout, becoming master');
          this.becomeMaster();
        } else {
          console.log('[checkMaster] Already master, ignoring');
        }
      }, 1000);
    } else {
      this.isMaster = false;
    }
  }

  private becomeMaster() {
    console.log('[becomeMaster] ⭐ Promoting this tab to master, tabId=', this.tabId);
    if (this.isMaster) return;
    this.isMaster = true;
    this.tabsStatus.clear();
    this.tabsStatus.set(this.tabId, this.localStatus);
    localStorage.setItem('masterId', this.tabId);

    this.connectWebSocket();

    this.socket!.addEventListener('open', () => {
      console.log('[becomeMaster] WebSocket open, flushing pending connect + initial status');
      // 1) flush pending "connect"
      if (this.pendingConnectConfig) {
        this.sendRaw({
          connect: { data: this.pendingConnectConfig, name: 'js' },
          id: 1,
        });
      }
      this.pendingSubscriptions.forEach(ch =>
        this.sendRaw({ subscribe: { channel: ch }, id: Date.now() })
      );
      this.pendingSubscriptions = [];
      // 2) flush current status
      this.sendRaw({ status: this.localStatus, id: Date.now() });
    }, { once: true });
    
  }

  private connectWebSocket() {
    console.log('[connectWebSocket] 🚀 Opening WebSocket connection');
    this.socket = new WebSocket('ws://localhost:8080');
    this.socket.onopen = () => {
      this.isConnected = true;
      if (this.onConnect) this.onConnect();
      this.resetInactivityTimer();
    };
    this.socket.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] 📥 Received from server:', data);
      this.channel?.postMessage({ type: 'MESSAGE', data });
    };
    this.socket.onerror = (error) => {
      console.error('[WebSocket]❌ Błąd WebSocket:', error, '❌ Ponawiam za 2s...');
      if (this.isMaster) {
        setTimeout(() => this.becomeMaster(), 2000);
      }
    };
    this.socket.onclose = () => {
      console.warn('[WebSocket]🔌 WebSocket rozłączony');
      this.isConnected = false;
      if (this.isMaster) {
        console.log('[WebSocket] MASTER tab closed connection, broadcasting MASTER_CLOSED');
        localStorage.removeItem('masterId');
        this.sendBroadcastMessage({ type: 'MASTER_CLOSED', closedTabId: this.tabId });
      }
    };
  }

  private handleChannelMessage(message: any) {
    if (message.tabId === this.tabId) return;
    console.log('[handleChannelMessage] 📥 Otrzymano wiadomość:', message);
    if (message.type === 'CHECK_MASTER' && this.isMaster) {
      console.log('[handleChannelMessage] Master exists, sending MASTER_EXISTS');
      this.channel?.postMessage({ type: 'MASTER_EXISTS' });
    } else if (message.type === 'MASTER_EXISTS') {
      console.log('[handleChannelMessage] MASTER_EXISTS received, clearing timeout and marking non-master');
      if (this.masterCheckTimeout) {
        clearTimeout(this.masterCheckTimeout);
      }
      this.isMaster = false;
    } else if (message.type === 'SEND_DATA' && this.isMaster) {
      console.log('[handleChannelMessage] Forwarding data to server:', message.data);
      this.sendRaw(message.data);
    } else if (message.type === 'STATUS_UPDATE') {
      console.log(`[handleChannelMessage] 🔄 Aktualizacja statusu "${message.status}" dla tabId: ${message.tabId}`);
      this.tabsStatus.set(message.tabId, message.status);
    
      if (this.isMaster) {
        this.determineAndSendStatus();
      }
    }
     else if (message.type === 'MASTER_CLOSED' && !this.isMaster) {
      console.log('[handleChannelMessage] MASTER_CLOSED received from', message.closedTabId, ', electing new master');
      if (message.closedTabId) {
        this.knownTabs.delete(message.closedTabId);
        this.tabsStatus.delete(message.closedTabId);
      }
      setTimeout(() => {
        this.electNewMaster();
    
        // Wyślij ponownie swój status, na wszelki wypadek:
        this.sendBroadcastMessage({ type: 'STATUS_UPDATE', status: this.localStatus });
      }, 100);
    } else if (message.type === 'ANNOUNCE') {
      if (this.knownTabs.has(message.tabId)) {
        console.log(`[handleChannelMessage] 🔁 Już znamy tabId=${message.tabId}, ignorujemy ponowne ANNOUNCE`);
        return;
      }
      this.knownTabs.add(message.tabId);
      this.sendBroadcastMessage({ type: 'ANNOUNCE' });
      this.sendBroadcastMessage({ type: 'STATUS_UPDATE', status: this.localStatus });
    } else if (message.type === 'MESSAGE') {
      console.log('[handleChannelMessage] 📥 Nie-główna karta otrzymała wiadomość z serwera:', message.data);
    } else if (message.type === 'TAB_CLOSED') {
      this.knownTabs.delete(message.tabId);
      this.tabsStatus.delete(message.tabId);
    } else if (message.type === 'NOT_MASTER_CLOSED') {
      console.log(`[handleChannelMessage] 🗂️ Tab nie-master zamknięta: ${message.closedTabId}`);
      this.knownTabs.delete(message.closedTabId);
      this.tabsStatus.delete(message.closedTabId);
    }    
  }

  private electNewMaster() {
    const allTabs = Array.from(this.knownTabs);
    if (allTabs.length === 0) return;
    allTabs.sort();
    const winner = allTabs[0];
    console.log('[electNewMaster] Known tabs:', allTabs, '→ winner:', winner);
    if (winner === this.tabId) {
      console.log('[electNewMaster] I am the new master');
      this.becomeMaster();
    } else {
      console.log('[electNewMaster] Waiting for master:', winner);
    }
  }

  public sendRaw(data: any) {
    console.log('[sendRaw] 📤 Wysyłamy na serwer:', data);
    try {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error('[sendRaw] ❌ Błąd przy wysyłaniu:', error);
    }
  }
  

  connect({
    user_id,
    username,
    credentials,
  }: {
    user_id: string;
    username: string;
    credentials: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      // Zapisujemy dane, żeby potem wysłać je w becomeMaster()
      this.pendingConnectConfig = { user_id, username, credentials };
  
      const message = {
        connect: {
          data: this.pendingConnectConfig,
          name: 'js',
        },
        id: 1,
      };
  
      if (this.isMaster) {
        // jeśli już jesteśmy masterem, wyślij natychmiast lub po open
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.sendRaw(message);
          resolve();
        } else {
          // nasłuch na open/error
          const handleOpen = () => {
            this.sendRaw(message);
            this.socket?.removeEventListener('open', handleOpen);
            resolve();
          };
          this.socket?.addEventListener('open', handleOpen);
          this.socket?.addEventListener('error', () => {
            this.socket?.removeEventListener('open', handleOpen);
            reject(new Error('WebSocket connection failed'));
          });
          // w razie gdy socket był zamknięty
          if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            this.connectWebSocket();
          }
        }
      } else {
        // jesteśmy non‑master – przekazujemy do broadcastu
        console.log('[connect] Not master, broadcasting CONNECT');
        resolve();
      }
    });
  } 
  

  send(event: string, data: any) {
    const message = { [event]: data, id: Date.now() };
    console.log(`[send] event=${event}, data=`, data);
    if (this.isMaster) {
      this.sendRaw(message);
    } else {
      this.channel?.postMessage({ type: 'SEND_DATA', data: message });
    }
  }

  public subscribe(channel: string) {
    this.pendingSubscriptions.push(channel);
    if (this.isMaster) {
      this.sendRaw({ subscribe: { channel }, id: Date.now() });
    } else {
      this.channel?.postMessage({
        type: 'SEND_DATA',
        data: { subscribe: { channel }, id: Date.now() }
      });
    }
    console.log(`[subscribe]📡 Subskrybowano kanał: ${channel}`);
  }
  

  initActivityTracking() {
    const handleActivity = () => {
      this.resetInactivityTimer();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });
    this.cleanupActivityTracking = () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }

  disconnect() {
    console.log('[disconnect] Called');
    if (this.isMaster && this.socket) {
      console.log('[disconnect] Closing master socket');
      this.socket.close();
      this.isConnected = false;
      localStorage.removeItem('masterId');
      this.channel?.postMessage({ type: 'MASTER_CLOSED', closedTabId: this.tabId });
    }
    if (this.cleanupActivityTracking) {
      console.log('[disconnect] 🧹 Czyszczenie nasłuchu aktywności');
      this.cleanupActivityTracking();
      this.cleanupActivityTracking = undefined;
    }
    this.channel?.close();
  }
}

export default new WebSocketService();