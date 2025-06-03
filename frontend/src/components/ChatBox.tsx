// src/components/ChatBox.tsx

import React, { useState, useEffect, useRef } from 'react';
import '../styles/GeneralChat.css'; // zaimportuj CSS, który podałeś

// Typ wiadomości czatu
export interface Message {
  from: string;
  text: string;
  timestamp: string;
}

interface ChatBoxProps {
  userAvatar: string; // adres avatara użytkownika
  onSendMessage: (text: string) => void; // funkcja do wysyłki wiadomości (może wywoływać wsService.sendMessage)
  onNewMessage?: (msg: Message) => void; // opcjonalny callback przy odbiorze nowej wiadomości (do integracji z wsService)
}

const ChatBox: React.FC<ChatBoxProps> = ({ userAvatar, onSendMessage, onNewMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Funkcja, która zostanie wywołana przy odbiorze nowej wiadomości (możesz później podpiąć callback z wsService)
  const handleIncomingMessage = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    if (onNewMessage) {
      onNewMessage(msg);
    }
  };

  // Przykładowe podpięcie do globalnego eventu (jeśli wsService dispatchuje CustomEvent 'wsMessage')
  useEffect(() => {
    const handler = (event: CustomEvent<Message>) => {
      handleIncomingMessage(event.detail);
    };
    window.addEventListener('wsMessage', handler as EventListener);
    return () => {
      window.removeEventListener('wsMessage', handler as EventListener);
    };
  }, []);

  // Automatyczne przewijanie do ostatniej wiadomości
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChatMessage = () => {
    if (input.trim() === '') return;
    // Wywołaj funkcję wysyłki wiadomości (która z kolei powinna korzystać z wsService)
    onSendMessage(input);
    // Dodaj wiadomość do lokalnego stanu, jako że wysyłamy ją z perspektywy "me"
    const newMsg: Message = {
      from: 'me', // lub możesz użyć np. currentUser.username
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendChatMessage();
    }
  };
  

  return (
    <div className="chat-container">
      <ul className="chat">
        {messages.map((msg, index) => (
          <li key={index} className={`message ${msg.from === 'me' ? 'right' : 'left'}`}>
            <img className="logo" src={userAvatar} alt="avatar" />
            <p>{msg.text}</p>
          </li>
        ))}
        <div ref={messagesEndRef} />
      </ul>
      <input
        type="text"
        className="text_input"
        placeholder="Message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyPress}
      />
    </div>
  );
};

export default ChatBox;
