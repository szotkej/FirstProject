import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ChatBox.tsx
import { useState, useEffect, useRef } from 'react';
import '../styles/GeneralChat.css'; // zaimportuj CSS, który podałeś
const ChatBox = ({ userAvatar, onSendMessage, onNewMessage }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    // Funkcja, która zostanie wywołana przy odbiorze nowej wiadomości (możesz później podpiąć callback z wsService)
    const handleIncomingMessage = (msg) => {
        setMessages((prev) => [...prev, msg]);
        if (onNewMessage) {
            onNewMessage(msg);
        }
    };
    // Przykładowe podpięcie do globalnego eventu (jeśli wsService dispatchuje CustomEvent 'wsMessage')
    useEffect(() => {
        const handler = (event) => {
            handleIncomingMessage(event.detail);
        };
        window.addEventListener('wsMessage', handler);
        return () => {
            window.removeEventListener('wsMessage', handler);
        };
    }, []);
    // Automatyczne przewijanie do ostatniej wiadomości
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const sendChatMessage = () => {
        if (input.trim() === '')
            return;
        // Wywołaj funkcję wysyłki wiadomości (która z kolei powinna korzystać z wsService)
        onSendMessage(input);
        // Dodaj wiadomość do lokalnego stanu, jako że wysyłamy ją z perspektywy "me"
        const newMsg = {
            from: 'me', // lub możesz użyć np. currentUser.username
            text: input,
            timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMsg]);
        setInput('');
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        }
    };
    return (_jsxs("div", { className: "chat-container", children: [_jsxs("ul", { className: "chat", children: [messages.map((msg, index) => (_jsxs("li", { className: `message ${msg.from === 'me' ? 'right' : 'left'}`, children: [_jsx("img", { className: "logo", src: userAvatar, alt: "avatar" }), _jsx("p", { children: msg.text })] }, index))), _jsx("div", { ref: messagesEndRef })] }), _jsx("input", { type: "text", className: "text_input", placeholder: "Message...", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyPress })] }));
};
export default ChatBox;
