import { jsx as _jsx } from "react/jsx-runtime";
// src\components\HomeBackground.tsx
import { useRef } from 'react';
import '../styles/HomeBackground.css';
const HomeBackground = () => {
    const videoRef = useRef(null);
    return (_jsx("div", { className: "home-background-container", children: _jsx("div", { className: "home-background-video", children: _jsx("video", { ref: videoRef, autoPlay: true, loop: true, muted: true, children: _jsx("source", { src: "/assets/HomeBackground.mp4", type: "video/mp4" }) }) }) }));
};
export default HomeBackground;
