import React, { useState, useEffect } from "react";
import { useAuth } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import "../styles/NavbarMainv2.css";

const DEFAULT_AVATAR = "/assets/default_avatar.jpg";
const API_URL = import.meta.env.VITE_API_URL;

const NavbarMain: React.FC = () => {
  const { displayName, photoURL, fontColor, uid } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string, displayName: string }[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const closeDropdown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement)?.closest(".dropdown")) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("click", closeDropdown);
    }
    return () => {
      document.removeEventListener("click", closeDropdown);
    };
  }, [isDropdownOpen]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Brak tokena autoryzacyjnego");

      const response = await fetch(`${API_URL}/search-users?query=${encodeURIComponent(value)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Błąd wyszukiwania graczy");

      const results = await response.json();
      console.log("Wyniki wyszukiwania:", results);
      setSearchResults(results);
    } catch (error) {
      console.error("Błąd wyszukiwania:", error);
    }
  };

  const handleResultClick = (userId: string) => {
    navigate(`/player?id=${userId}`);
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleProfileClick = () => {
    if (uid) {
      navigate(`/player?id=${uid}`); // Navigate to /player?id={uid}
    } else {
      console.error("User ID not available");
      navigate("/"); // Fallback to home if uid is not available
    }
  };

  return (
    <nav className="navbar-main" id="navbar-main">
      <div className="container-fluid">
        <a className="nav-link-home" onClick={() => navigate("/")}>
          Home Page
        </a>

        <div className="navbar-search position-relative">
          <div className="search-group">
            <input
              className="search-input"
              placeholder="Search players..."
              type="text"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="results-menu">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="result-item"
                  onClick={() => handleResultClick(user.id)}
                >
                  {user.displayName}
                </div>
              ))}
            </div>
          )}
        </div>

        <ul className="navbar-nav">
          <li className="nav-item">
            <div
              className="nav-link"
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(!isDropdownOpen);
              }}
            >
              <span className="avatar">
                <img
                  src={photoURL || DEFAULT_AVATAR}
                  alt="Profile"
                  style={{
                    border: `4px solid ${fontColor || "#000000"}`, // Obramowanie w kolorze fontColor
                    borderRadius: "50%", // Zachowanie zaokrąglenia
                  }}
                />
              </span>
              <div className="media-body">
                <span>{displayName}</span>
              </div>
            </div>

            <div className={`dropdown-menu-right ${isDropdownOpen ? "visible" : "hidden"}`}>
              <div className="menu-header">
                <h6>Welcome!</h6>
              </div>
              <div className="result-item" onClick={handleProfileClick}>
                <i className="ni ni-single-02"></i>
                <span>My profile</span>
              </div>
              <a href="/lobby" className="result-item">
                <i className="ni ni-settings-gear-65"></i>
                <span>Lobby</span>
              </a>
              <div className="menu-divider"></div>
              <a href="#!" className="result-item">
                <i className="ni ni-user-run"></i>
                <span>Logout</span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavbarMain;