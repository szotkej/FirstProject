// frontend\src\components\Layout.tsx

import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/NavbarMain";

const Layout: React.FC = () => {
  return (
    <>
      <Navbar />
      <div className="main-content">
        <Outlet /> {/* Tutaj będą ładowane Twoje strony: Home, Lobby, PlayerProfile itd. */}
      </div>
    </>
  );
};

export default Layout;
