import { jsx as _jsx } from "react/jsx-runtime";
// src/Home.tsx
import { Link } from 'react-router-dom';
import './styles/Home.css';
function Home() {
    return (_jsx("div", { children: _jsx(Link, { to: "/lobby", className: "lobby-link", children: _jsx("h1", { className: "lobby-text", children: "Lobby" }) }) }));
}
export default Home;
