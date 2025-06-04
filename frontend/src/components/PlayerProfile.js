import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src\components\PlayerProfile.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/PlayerProfile.css";
const formatLastSeen = (lastSeen) => {
    if (!lastSeen)
        return "N/A";
    if (typeof lastSeen === "string")
        return lastSeen;
    if ("toDate" in lastSeen)
        return lastSeen.toDate().toLocaleString();
    return "N/A";
};
const DEFAULT_AVATAR = "/assets/default_avatar.jpg";
const API_URL = "https://firstproject-backend.onrender.com/api"; // Adres API
//const API_URL = "http://localhost:3001/api"; // Adres API
const PlayerProfile = () => {
    // Pobieramy dane z kontekstu użytkownika; teraz dane te będą aktualizowane na bieżąco, np. status przez WS.
    const dataUser = useAuth();
    console.log("dataUser from UserContext", dataUser);
    const { uid: loggedInUserId, displayName, photoURL, status, lastSeen, loading: authLoading } = dataUser;
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (authLoading)
            return;
        const searchParams = new URLSearchParams(location.search);
        const profileUserId = searchParams.get("id") || loggedInUserId;
        if (!profileUserId) {
            console.error("Brak profileUserId, przekierowanie...");
            navigate("/");
            return;
        }
        // Jeśli przeglądamy swój profil – używamy danych z UserContext (aktualizowanych przez WebSocketContext)
        if (profileUserId === loggedInUserId) {
            setUserData({
                displayName: displayName || "",
                photoURL: photoURL || "",
                birthDate: null,
                location: null,
                createdAt: "",
                lastSeen: lastSeen, // będzie aktualizowane na bieżąco
                aboutMe: null,
                fontColor: null,
                status: status,
            });
            setLoading(false);
            return;
        }
        // Jeśli przeglądamy profil innego użytkownika – pobieramy dane z API
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem("authToken");
                if (!token)
                    throw new Error("Brak tokena autoryzacyjnego");
                const response = await fetch(`${API_URL}/profile/${profileUserId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok)
                    throw new Error("Błąd pobierania profilu");
                const userDataFromAPI = await response.json();
                console.log("dataUser from API", userDataFromAPI);
                setUserData(userDataFromAPI);
            }
            catch (error) {
                console.error("Błąd pobierania profilu:", error);
            }
            finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, [authLoading, loggedInUserId, navigate]);
    useEffect(() => {
        // Obsługa zamykania dropdowna
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
    if (authLoading)
        return _jsx("div", { children: "\u0141adowanie autoryzacji..." });
    if (loading)
        return _jsx("div", { children: "\u0141adowanie profilu..." });
    if (!userData)
        return _jsx("div", { children: "Nie znaleziono u\u017Cytkownika!" });
    return (_jsxs("div", { className: "main-content", children: [_jsx("nav", { className: "navbar navbar-top navbar-expand-md navbar-dark", id: "navbar-main", children: _jsxs("div", { className: "container-fluid", children: [_jsx("a", { className: "h4 mb-0 text-uppercase d-none d-lg-inline-block", href: "https://www.creative-tim.com/product/argon-dashboard", target: "_blank", rel: "noreferrer", children: "User profile" }), _jsx("form", { className: "navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto", children: _jsx("div", { className: "form-group mb-0", children: _jsxs("div", { className: "input-group input-group-alternative", children: [_jsx("div", { className: "input-group-prepend", children: _jsx("span", { className: "input-group-text", children: _jsx("i", { className: "fas fa-search" }) }) }), _jsx("input", { className: "form-control", placeholder: "Search", type: "text" })] }) }) }), _jsx("ul", { className: "navbar-nav align-items-center d-none d-md-flex", children: _jsxs("li", { className: "nav-item dropdown", children: [_jsx("a", { className: "nav-link pr-0 cursor-pointer", onClick: (e) => {
                                            e.stopPropagation();
                                            setIsDropdownOpen(!isDropdownOpen);
                                        }, children: _jsxs("div", { className: "media align-items-center", children: [_jsx("span", { className: "avatar avatar-sm rounded-circle", children: _jsx("img", { src: userData.photoURL || DEFAULT_AVATAR, className: "rounded-circle", alt: "Profile" }) }), _jsx("div", { className: "media-body ml-2 d-none d-lg-block", children: _jsx("span", { className: "mb-0 text-sm font-weight-bold", children: userData.displayName }) })] }) }), _jsxs("div", { className: `dropdown-menu dropdown-menu-arrow dropdown-menu-right ${isDropdownOpen ? "visible" : "hidden"}`, children: [_jsx("div", { className: "dropdown-header noti-title", children: _jsx("h6", { className: "text-overflow m-0", children: "Welcome!" }) }), _jsxs("a", { href: "../examples/profile.html", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-single-02" }), _jsx("span", { children: "My profile" })] }), _jsxs("a", { href: "../examples/profile.html", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-settings-gear-65" }), _jsx("span", { children: "Settings" })] }), _jsxs("a", { href: "../examples/profile.html", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-calendar-grid-58" }), _jsx("span", { children: "Activity" })] }), _jsxs("a", { href: "../examples/profile.html", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-support-16" }), _jsx("span", { children: "Support" })] }), _jsx("div", { className: "dropdown-divider" }), _jsxs("a", { href: "#!", className: "dropdown-item", children: [_jsx("i", { className: "ni ni-user-run" }), _jsx("span", { children: "Logout" })] })] })] }) })] }) }), _jsx("div", { className: "container-fluid mt--8", children: _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-xl-4 order-xl-2 mb-5 mb-xl-0", children: _jsxs("div", { className: "card card-profile shadow", children: [_jsx("div", { className: "row justify-content-center", children: _jsx("div", { className: "col-lg-3 order-lg-2", children: _jsx("div", { className: "card-profile-image", children: _jsx("a", { href: "#!", children: _jsx("img", { src: userData.photoURL || DEFAULT_AVATAR, className: "rounded-circle", alt: "Profile" }) }) }) }) }), _jsx("div", { className: "card-header text-center border-0 pt-8 pt-md-4 pb-0 pb-md-4", children: _jsxs("div", { className: "d-flex justify-content-between", children: [_jsx("a", { href: "#!", className: "btn btn-sm btn-info mr-4", children: "Connect" }), _jsx("a", { href: "#!", className: "btn btn-sm btn-default float-right", children: "Message" })] }) }), _jsx("div", { className: "card-body pt-0 pt-md-5", children: _jsxs("div", { className: "text-center", children: [_jsxs("h3", { children: [userData.displayName, _jsxs("span", { className: "font-weight-light", children: [", ", userData.birthDate || "N/A"] })] }), _jsxs("div", { className: "h5 font-weight-300", children: [_jsx("i", { className: "ni location_pin mr-2" }), userData.location || "Brak lokalizacji"] }), _jsxs("div", { className: "h5 mt-4", children: [_jsx("i", { className: "ni business_briefcase-24 mr-2" }), "Last seen: ", userData.status === "Online" ? "Now" : formatLastSeen(userData.lastSeen)] }), _jsxs("div", { children: [_jsx("i", { className: "ni education_hat mr-2" }), "Member since ", userData.createdAt || "N/A"] }), _jsx("hr", { className: "my-4" }), _jsx("p", { children: userData.aboutMe || "Brak opisu" })] }) })] }) }), _jsx("div", { className: "col-xl-8 order-xl-1", children: _jsxs("div", { className: "card bg-secondary shadow", children: [_jsx("div", { className: "card-header bg-white border-0", children: _jsxs("div", { className: "row align-items-center", children: [_jsx("div", { className: "col-8", children: _jsx("h3", { className: "mb-0", children: "My account" }) }), _jsx("div", { className: "col-4 text-right", children: _jsx("a", { href: "#!", className: "btn btn-sm btn-primary", children: "Settings" }) })] }) }), _jsx("div", { className: "card-body", children: _jsxs("form", { children: [_jsx("h6", { className: "heading-small text-muted mb-4", children: "User information" }), _jsxs("div", { className: "pl-lg-4", children: [_jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-6", children: _jsxs("div", { className: "form-group focused", children: [_jsx("label", { className: "form-control-label", htmlFor: "input-username", children: "Username" }), _jsx("input", { type: "text", id: "input-username", className: "form-control form-control-alternative", placeholder: `Insert new username or stay ${userData.displayName}`, defaultValue: userData.displayName })] }) }), _jsx("div", { className: "col-lg-6", children: _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "form-control-label", htmlFor: "input-bday", children: "My birth date" }), _jsx("input", { type: "text", id: "input-bday", className: "form-control form-control-alternative", placeholder: userData.birthDate || "Brak daty urodzenia", defaultValue: userData.birthDate || "" })] }) })] }), _jsxs("div", { className: "row", children: [_jsx("div", { className: "col-lg-6", children: _jsxs("div", { className: "form-group focused", children: [_jsx("label", { className: "form-control-label", htmlFor: "input-favorite-color", children: "Favorite color" }), _jsx("input", { type: "text", id: "input-favorite-color", className: "form-control form-control-alternative", placeholder: "Font color", defaultValue: userData.fontColor || "" })] }) }), _jsx("div", { className: "col-lg-6", children: _jsxs("div", { className: "form-group focused", children: [_jsx("label", { className: "form-control-label", htmlFor: "input-location", children: "Location" }), _jsx("input", { type: "text", id: "input-location", className: "form-control form-control-alternative", placeholder: "Your location (not necessary real)", defaultValue: userData.location || "" })] }) })] })] }), _jsx("hr", { className: "my-4" }), _jsx("h6", { className: "heading-small text-muted mb-4", children: "About me" }), _jsx("div", { className: "pl-lg-4", children: _jsxs("div", { className: "form-group focused", children: [_jsx("label", { children: "About Me" }), _jsx("textarea", { rows: 4, className: "form-control form-control-alternative", placeholder: "A few words about you ...", defaultValue: userData.aboutMe || "" })] }) })] }) })] }) })] }) })] }));
};
export default PlayerProfile;
