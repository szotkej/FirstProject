import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// src\Lobby.tsx
import { useContext } from "react";
//import UserAvatarWithMenu from "./components/UserAvatarWithMenu";
import { UserContext } from "./context/UserContext";
// import LobbyBackground from "./components/LobbyBackground";
//import GeneralChat from "./components/GeneralChat";
//import GameTables from "./components/GameTables";
//import OnlineUsers from "./components/OnlineUsers";
import "./styles/Lobby.css";
const Lobby = () => {
    const user = useContext(UserContext);
    return (_jsx("div", { children: _jsxs("div", { className: "lobby-container", children: [_jsx("div", { className: "lobby-content", children: _jsx("div", { className: "sidebar" }) }), user && (_jsx(_Fragment, {}))] }) }));
};
export default Lobby;
