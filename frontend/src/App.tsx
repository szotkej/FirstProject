// frontend\src\App.tsx

import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import Layout from "./components/Layout"; // <-- Layout!
import Home from "./Home";
import Lobby from "./Lobby";
import PlayerProfile from "./components/PlayerProfile";
import Game from "./components/Game";

const App: React.FC = () => {
  return (
    <UserProvider>
      <WebSocketProvider>
        <Router>
          <Routes>
            {/* Routes with Navbar (wrapped in Layout) */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="lobby" element={<Lobby />} />
              <Route path="player" element={<PlayerProfile />} />
            </Route>
             {/* Routes without Navbar */}
             <Route path="/game" element={<Game />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </UserProvider>
  );
};

export default App;
