import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src\components\GameTables.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/UserContext";
import styles from "../styles/GameTables.module.css";
//const API_URL = "http://localhost:3001/api"; // Zastąp adresem swojego API
const API_URL = "https://firstproject-backend.onrender.com/api"; // Zastąp adresem swojego API
const GameTables = () => {
    const [tables, setTables] = useState([]);
    const user = useAuth();
    // Pobieranie stołów z API
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token)
                    throw new Error("Brak tokena autoryzacyjnego");
                const response = await fetch(`${API_URL}/tables`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok)
                    throw new Error("Błąd pobierania stołów");
                const tableList = await response.json();
                setTables(tableList);
            }
            catch (error) {
                console.error("Błąd pobierania stołów:", error);
            }
        };
        fetchTables();
    }, []);
    // Tworzenie stołu
    const handleCreateTable = async () => {
        if (!user) {
            alert("Musisz być zalogowany, aby utworzyć stół!");
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            if (!token)
                throw new Error("Brak tokena autoryzacyjnego");
            const newTable = {
                idOwner: user.uid,
                creator: user.displayName || "Anonymous Player",
                createdAt: Date.now(),
                status: "waiting",
                players: [
                    {
                        id: user.uid,
                        name: user.displayName || "Anonymous Player",
                        avatar: user.photoURL || "/default-avatar.png",
                    },
                ],
                maxPlayers: 12,
            };
            const response = await fetch(`${API_URL}/tables`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newTable),
            });
            if (!response.ok)
                throw new Error("Błąd tworzenia stołu");
            const createdTable = await response.json();
            setTables((prev) => [...prev, createdTable]);
        }
        catch (error) {
            console.error("Błąd przy tworzeniu stołu:", error);
        }
    };
    // Dołączanie do stołu
    const handleJoinTable = async (tableId) => {
        if (!user) {
            alert("Musisz być zalogowany, aby dołączyć do stołu!");
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            if (!token)
                throw new Error("Brak tokena autoryzacyjnego");
            const response = await fetch(`${API_URL}/tables/${tableId}/join`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    player: {
                        id: user.uid,
                        name: user.displayName || "Anonymous Player",
                        avatar: user.photoURL || "/default-avatar.png",
                    },
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.error || "Błąd dołączania do stołu");
                return;
            }
            const updatedTable = await response.json();
            setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));
        }
        catch (error) {
            console.error("Błąd dołączania do stołu:", error);
        }
    };
    // Opuszczanie stołu
    const handleQuitTable = async (tableId) => {
        if (!user) {
            alert("Musisz być zalogowany, aby opuścić stół!");
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            if (!token)
                throw new Error("Brak tokena autoryzacyjnego");
            const response = await fetch(`${API_URL}/tables/${tableId}/quit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ playerId: user.uid }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.error || "Błąd opuszczania stołu");
                return;
            }
            const updatedTable = await response.json();
            if (updatedTable.players.length === 0) {
                setTables((prev) => prev.filter((t) => t.id !== tableId));
            }
            else {
                setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));
            }
        }
        catch (error) {
            console.error("Błąd opuszczania stołu:", error);
        }
    };
    // Wyrzucanie gracza
    const handleExpelPlayer = async (tableId, playerId) => {
        if (!user) {
            alert("Musisz być zalogowany, aby wyrzucić gracza!");
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            if (!token)
                throw new Error("Brak tokena autoryzacyjnego");
            const response = await fetch(`${API_URL}/tables/${tableId}/expel`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ playerId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.error || "Błąd wyrzucania gracza");
                return;
            }
            const updatedTable = await response.json();
            if (updatedTable.players.length === 0) {
                setTables((prev) => prev.filter((t) => t.id !== tableId));
            }
            else {
                setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));
            }
        }
        catch (error) {
            console.error("Błąd wyrzucania gracza:", error);
        }
    };
    return (_jsxs("div", { className: styles.container, children: [_jsx("h2", { className: styles.title, children: "Game Tables" }), _jsx("button", { onClick: handleCreateTable, className: styles.createTableButton, children: "Create New Table" }), _jsx("div", { className: styles.tableList, children: tables.map((table) => (_jsxs("div", { className: styles.gametable, children: [_jsx("div", { className: styles.gametableIndicator }), _jsxs("div", { className: styles.gametableContent, children: [_jsxs("div", { className: styles.gametableUpperPart, children: [_jsxs("div", { className: styles.gameInfo, children: [_jsxs("span", { className: styles.gamename, children: ["Game: ", table.creator, "'s Table"] }), _jsxs("div", { className: styles.tableStatus, children: ["Status: ", table.status] })] }), _jsxs("div", { className: styles.gametable_button_zone, children: [user?.uid === table.idOwner && (_jsxs(_Fragment, { children: [_jsx("button", { className: `${styles.button} ${styles.button_blue}`, id: `startgame_${table.id}`, children: "Start" }), _jsx("a", { className: `${styles.button} ${styles.button_blue}`, id: `configgame_${table.id}`, href: `/table?table=${table.id}&nr=true`, children: "Configure" })] })), table.players.some((player) => player.id === user?.uid) ? (_jsx("button", { onClick: () => handleQuitTable(table.id), className: `${styles.button} ${styles.button_gray}`, id: `quitgame_${table.id}`, children: "Quit" })) : (_jsx("button", { onClick: () => handleJoinTable(table.id), className: `${styles.button} ${styles.button_blue}`, id: `joingame_${table.id}`, children: "Join" }))] })] }), _jsx("div", { className: styles.gametableSeparator }), _jsxs("div", { className: styles.players, id: `players_table_${table.id}`, children: [table.players.map((player) => (_jsxs("div", { className: styles.tableplace, children: [_jsx("div", { className: styles.emblemwrap, children: _jsx("img", { src: player.avatar, alt: player.name, className: styles.emblem }) }), _jsxs("div", { className: styles.playerNameWrap, children: [_jsx("span", { className: styles.playerName, children: player.name }), user?.uid === table.idOwner && user?.uid !== player.id && (_jsx("a", { onClick: () => handleExpelPlayer(table.id, player.id), className: styles.expel, children: "[Expel]" }))] })] }, player.id))), Array(table.maxPlayers - table.players.length).fill(null).map((_, index) => (_jsxs("div", { className: `${styles.tableplace} ${styles.tableplaceFreeplace}`, children: [_jsx("div", { className: styles.emblemwrap, children: _jsx("img", { src: "/assets/freeplaces.png", alt: "Free Place", className: styles.freePlaceImage }) }), _jsxs("div", { className: styles.playerNameWrap, children: [_jsx("span", { className: styles.playerName, children: "(Free)" }), _jsx("br", {})] })] }, `free_${index}`)))] })] })] }, table.id))) })] }));
};
export default GameTables;
