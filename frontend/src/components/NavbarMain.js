import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useAuth } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import "../styles/file.css";
import "../styles/SearchResults.css";
const DEFAULT_AVATAR = "/assets/default_avatar.jpg";
//const API_URL = "http://localhost:3001/api"; // <-- Zmienna na Twój backend
const API_URL = "https://firstproject-backend.onrender.com/api"; // <-- Zmienna na Twój backend
const NavbarMain = () => {
    const { displayName, photoURL } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        const closeDropdown = (event) => {
            if (!event.target?.closest(".dropdown")) {
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
    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.trim().length === 0) {
            setSearchResults([]);
            return;
        }
        try {
            const token = localStorage.getItem("authToken");
            if (!token)
                throw new Error("Brak tokena autoryzacyjnego");
            const response = await fetch(`${API_URL}/search-users?query=${encodeURIComponent(value)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok)
                throw new Error("Błąd wyszukiwania graczy");
            const results = await response.json();
            console.log("Wyniki wyszukiwania:", results);
            setSearchResults(results); // Oczekiwany format: [{ id, displayName }]
        }
        catch (error) {
            console.error("Błąd wyszukiwania:", error);
        }
    };
    const handleResultClick = (userId) => {
        navigate(`/player?id=${userId}`);
        setSearchTerm("");
        setSearchResults([]);
    };
    return (_jsx("nav", { className: "navbar navbar-top navbar-expand-md navbar-dark", id: "navbar-main", children: _jsxs("div", { className: "container-fluid", children: [_jsx("a", { className: "h4 mb-0 text-uppercase d-none d-lg-inline-block cursor-pointer", onClick: () => navigate("/"), children: "Home Page" }), _jsxs("div", { className: "navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto position-relative", children: [_jsx("div", { className: "form-group mb-0", children: _jsxs("div", { className: "input-group input-group-alternative", children: [_jsx("div", { className: "input-group-prepend", children: _jsx("span", { className: "input-group-text", children: _jsx("i", { className: "fas fa-search" }) }) }), _jsx("input", { className: "form-control", placeholder: "Search players...", type: "text", value: searchTerm, onChange: handleSearch })] }) }), searchResults.length > 0 && (_jsx("div", { className: "dropdown-menu show", style: { position: "absolute", top: "100%", left: 0, right: 0 }, children: searchResults.map((user) => (_jsx("div", { className: "dropdown-item cursor-pointer", onClick: () => handleResultClick(user.id), children: user.displayName }, user.id))) }))] }), _jsx("ul", { className: "navbar-nav align-items-center d-none d-md-flex", children: _jsxs("li", { className: "nav-item dropdown", children: [_jsx("div", { className: "nav-link pr-0 cursor-pointer", onClick: (e) => {
                                    e.stopPropagation();
                                    setIsDropdownOpen(!isDropdownOpen);
                                }, children: _jsxs("div", { className: "media align-items-center", children: [_jsx("span", { className: "avatar avatar-sm rounded-circle", children: _jsx("img", { src: photoURL || DEFAULT_AVATAR, alt: "Profile", className: "rounded-circle" }) }), _jsx("div", { className: "media-body ml-2 d-none d-lg-block", children: _jsx("span", { className: "mb-0 text-sm font-weight-bold", children: displayName }) })] }) }), _jsxs("div", { className: `dropdown-menu dropdown-menu-arrow dropdown-menu-right ${isDropdownOpen ? "visible" : "hidden"}`, children: [_jsx("div", { className: "dropdown-header noti-title", children: _jsx("h6", { className: "text-overflow m-0", children: "Welcome!" }) }), _jsxs("a", { href: "/player", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-single-02" }), _jsx("span", { children: "My profile" })] }), _jsxs("a", { href: "/lobby", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-settings-gear-65" }), _jsx("span", { children: "Lobby" })] }), _jsx("div", { className: "dropdown-divider" }), _jsxs("a", { href: "#!", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-user-run" }), _jsx("span", { children: "Logout" })] })] })] }) })] }) }));
};
export default NavbarMain;
