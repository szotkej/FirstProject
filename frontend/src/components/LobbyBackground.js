import { jsx as _jsx } from "react/jsx-runtime";
// src\components\LobbyBackground.tsx
import { useRef } from 'react';
import '../styles/LobbyBackground.css';
const LobbyBackground = () => {
    const videoRef = useRef(null);
    return (_jsx("div", { className: "lobby-background-container", children: _jsx("div", { className: "lobby-background-video", children: _jsx("video", { ref: videoRef, autoPlay: true, loop: true, muted: true, children: _jsx("source", { src: "/assets/LobbyBackground.mp4", type: "video/mp4" }) }) }) }));
};
export default LobbyBackground;
