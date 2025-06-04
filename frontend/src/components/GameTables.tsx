// src\components\GameTables.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/UserContext";
import styles from "../styles/GameTables.module.css";

interface GameTable {
  id: string;
  creator: string;
  createdAt: number;
  status: string;
  players: { id: string; name: string; avatar: string }[];
  maxPlayers: number;
  idOwner: string;
}

//const API_URL = "http://localhost:3001/api"; // Zastąp adresem swojego API
const API_URL = "https://firstproject-backend.onrender.com/api"; // Zastąp adresem swojego API

const GameTables: React.FC = () => {
  const [tables, setTables] = useState<GameTable[]>([]);
  const user = useAuth();

  // Pobieranie stołów z API
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Brak tokena autoryzacyjnego");

        const response = await fetch(`${API_URL}/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Błąd pobierania stołów");

        const tableList: GameTable[] = await response.json();
        setTables(tableList);
      } catch (error) {
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
      if (!token) throw new Error("Brak tokena autoryzacyjnego");

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

      if (!response.ok) throw new Error("Błąd tworzenia stołu");

      const createdTable = await response.json();
      setTables((prev) => [...prev, createdTable]);
    } catch (error) {
      console.error("Błąd przy tworzeniu stołu:", error);
    }
  };

  // Dołączanie do stołu
  const handleJoinTable = async (tableId: string) => {
    if (!user) {
      alert("Musisz być zalogowany, aby dołączyć do stołu!");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Brak tokena autoryzacyjnego");

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
    } catch (error) {
      console.error("Błąd dołączania do stołu:", error);
    }
  };

  // Opuszczanie stołu
  const handleQuitTable = async (tableId: string) => {
    if (!user) {
      alert("Musisz być zalogowany, aby opuścić stół!");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Brak tokena autoryzacyjnego");

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
      } else {
        setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));
      }
    } catch (error) {
      console.error("Błąd opuszczania stołu:", error);
    }
  };

  // Wyrzucanie gracza
  const handleExpelPlayer = async (tableId: string, playerId: string) => {
    if (!user) {
      alert("Musisz być zalogowany, aby wyrzucić gracza!");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Brak tokena autoryzacyjnego");

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
      } else {
        setTables((prev) => prev.map((t) => (t.id === tableId ? updatedTable : t)));
      }
    } catch (error) {
      console.error("Błąd wyrzucania gracza:", error);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Game Tables</h2>
      <button onClick={handleCreateTable} className={styles.createTableButton}>
        Create New Table
      </button>
      <div className={styles.tableList}>
        {tables.map((table) => (
          <div key={table.id} className={styles.gametable}>
            <div className={styles.gametableIndicator}></div>
            <div className={styles.gametableContent}>
              <div className={styles.gametableUpperPart}>
                <div className={styles.gameInfo}>
                  <span className={styles.gamename}>Game: {table.creator}'s Table</span>
                  <div className={styles.tableStatus}>Status: {table.status}</div>
                </div>
                <div className={styles.gametable_button_zone}>
                  {user?.uid === table.idOwner && (
                    <>
                      <button className={`${styles.button} ${styles.button_blue}`} id={`startgame_${table.id}`}>
                        Start
                      </button>
                      <a className={`${styles.button} ${styles.button_blue}`} id={`configgame_${table.id}`} href={`/table?table=${table.id}&nr=true`}>
                        Configure
                      </a>
                    </>
                  )}
                  {table.players.some((player) => player.id === user?.uid) ? (
                    <button onClick={() => handleQuitTable(table.id)} className={`${styles.button} ${styles.button_gray}`} id={`quitgame_${table.id}`}>
                      Quit
                    </button>
                  ) : (
                    <button onClick={() => handleJoinTable(table.id)} className={`${styles.button} ${styles.button_blue}`} id={`joingame_${table.id}`}>
                      Join
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.gametableSeparator}></div>
              <div className={styles.players} id={`players_table_${table.id}`}>
                {table.players.map((player) => (
                  <div key={player.id} className={styles.tableplace}>
                    <div className={styles.emblemwrap}>
                      <img src={player.avatar} alt={player.name} className={styles.emblem} />
                    </div>
                    <div className={styles.playerNameWrap}>
                      <span className={styles.playerName}>{player.name}</span>
                      {user?.uid === table.idOwner && user?.uid !== player.id && (
                        <a onClick={() => handleExpelPlayer(table.id, player.id)} className={styles.expel}>
                          [Expel]
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {Array(table.maxPlayers - table.players.length).fill(null).map((_, index) => (
                  <div key={`free_${index}`} className={`${styles.tableplace} ${styles.tableplaceFreeplace}`}>
                    <div className={styles.emblemwrap}>
                      <img src="/assets/freeplaces.png" alt="Free Place" className={styles.freePlaceImage} />
                    </div>
                    <div className={styles.playerNameWrap}>
                      <span className={styles.playerName}>(Free)</span><br />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameTables;