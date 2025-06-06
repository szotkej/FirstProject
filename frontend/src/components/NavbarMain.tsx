  import React, { useState, useEffect } from "react";
  import { useAuth } from "../context/UserContext";
  import { useNavigate } from "react-router-dom";
  import "../styles/file.css";
  import "../styles/SearchResults.css";
  const DEFAULT_AVATAR = "/assets/default_avatar.jpg";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  const NavbarMain: React.FC = () => {
    const { displayName, photoURL } = useAuth();
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

    // Funkcja do obsługi wyszukiwania
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
        setSearchResults(results); // Oczekiwany format: [{ id, displayName }]
      } catch (error) {
        console.error("Błąd wyszukiwania:", error);
      }
    };

    const handleResultClick = (userId: string) => {
      navigate(`/player?id=${userId}`);
      setSearchTerm("");
      setSearchResults([]);
    };

    return (
      <nav className="navbar navbar-top navbar-expand-md navbar-dark" id="navbar-main">
        <div className="container-fluid">
          <a
            className="h4 mb-0 text-uppercase d-none d-lg-inline-block cursor-pointer"
            onClick={() => navigate("/")}
          >
            Home Page
          </a>

          <div className="navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto position-relative">
            <div className="form-group mb-0">
              <div className="input-group input-group-alternative">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                </div>
                <input
                  className="form-control"
                  placeholder="Search players..."
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>

            {/* WYNIKI SZUKANIA */}
            {searchResults.length > 0 && (
              <div className="dropdown-menu show" style={{ position: "absolute", top: "100%", left: 0, right: 0 }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="dropdown-item cursor-pointer"
                    onClick={() => handleResultClick(user.id)}
                  >
                    {user.displayName}
                  </div> 
                ))}
              </div>
            )}
          </div>

          <ul className="navbar-nav align-items-center d-none d-md-flex">
            <li className="nav-item dropdown">
              <div
                className="nav-link pr-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <div className="media align-items-center">
                  <span className="avatar avatar-sm rounded-circle">
                    <img src={photoURL || DEFAULT_AVATAR} alt="Profile" className="rounded-circle" />
                  </span>
                  <div className="media-body ml-2 d-none d-lg-block">
                    <span className="mb-0 text-sm font-weight-bold">{displayName}</span>
                  </div>
                </div>
              </div>

              <div className={`dropdown-menu dropdown-menu-arrow dropdown-menu-right ${isDropdownOpen ? "visible" : "hidden"}`}>
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">Welcome!</h6>
                </div>
                <a href="/player" className="dropdown-item">
                  <i className="ni ni-single-02"></i>
                  <span>My profile</span>
                </a>
                <a href="/lobby" className="dropdown-item">
                  <i className="ni ni-settings-gear-65"></i>
                  <span>Lobby</span>
                </a>
                <div className="dropdown-divider"></div>
                <a href="#!" className="dropdown-item">
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
