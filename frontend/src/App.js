import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import Layout from "./components/Layout"; // <-- Layout!
import Home from "./Home";
import Lobby from "./Lobby";
import PlayerProfile from "./components/PlayerProfile";
const App = () => {
    return (_jsx(UserProvider, { children: _jsx(WebSocketProvider, { children: _jsx(Router, { children: _jsx(Routes, { children: _jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Home, {}) }), _jsx(Route, { path: "lobby", element: _jsx(Lobby, {}) }), _jsx(Route, { path: "player", element: _jsx(PlayerProfile, {}) })] }) }) }) }) }));
};
export default App;
