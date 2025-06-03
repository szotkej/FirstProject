  // src\Lobby.tsx

  import React, { useContext, useState, useEffect } from "react";
  import UserAvatarWithMenu from "./components/UserAvatarWithMenu";
  import { UserContext } from "./context/UserContext";
  // import LobbyBackground from "./components/LobbyBackground";
  //import GeneralChat from "./components/GeneralChat";
  //import GameTables from "./components/GameTables";
  //import OnlineUsers from "./components/OnlineUsers";
  import "./styles/Lobby.css";
  
  const Lobby: React.FC = () => {
    const user = useContext(UserContext);

    return (
    <div>
      {/* <LobbyBackground /> */}
      <div className="lobby-container">
        <div className="lobby-content">
          {/* Sekcja Stoliki Gier */}
          {/*<GameTables />*/}
          
          {/* Panel Boczny */}
          <div className="sidebar">
            {/*<GeneralChat />*/}
          </div>
        </div>
        {user && (
          <>
           {/* <OnlineUsers />*/}
            {/*<UserAvatarWithMenu avatar={user.avatar ?? undefined} status={user.status} />*/}
          </>
        )}
        </div>
    </div>
    );
  };

  export default Lobby;