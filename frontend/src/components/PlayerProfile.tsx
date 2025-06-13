// src\components\PlayerProfile.tsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/PlayerProfile.css";
import { Timestamp } from "firebase/firestore";


interface UserData {
  displayName: string;
  photoURL: string;
  birthDate: string | null;
  location: string | null;
  createdAt: string;
  lastSeen: Timestamp | string | null;
  aboutMe: string | null;
  fontColor: string | null;
  status: "Online" | "Offline" | "AFK";
}
const formatLastSeen = (lastSeen: Timestamp | string | null): string => {
  if (!lastSeen) return "N/A";
  if (typeof lastSeen === "string") return lastSeen;
  if ("toDate" in lastSeen) return lastSeen.toDate().toLocaleString();
  return "N/A";
};

const DEFAULT_AVATAR = "/assets/default_avatar.jpg"
const API_URL = import.meta.env.VITE_API_URL;

const PlayerProfile: React.FC = () => {
  // Pobieramy dane z kontekstu użytkownika; teraz dane te będą aktualizowane na bieżąco, np. status przez WS.
  const dataUser = useAuth();
  console.log("dataUser from UserContext", dataUser);
  const { uid: loggedInUserId, displayName, photoURL, status, lastSeen, loading: authLoading } = dataUser
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

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
        status: status as "Online" | "Offline" | "AFK",
      });
      setLoading(false);
      return;
    }

     // Jeśli przeglądamy profil innego użytkownika – pobieramy dane z API
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Brak tokena autoryzacyjnego");

        const response = await fetch(`${API_URL}/profile/${profileUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Błąd pobierania profilu");

        const userDataFromAPI: UserData = await response.json();
        console.log("dataUser from API", userDataFromAPI);
        setUserData(userDataFromAPI);
      } catch (error) {
        console.error("Błąd pobierania profilu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authLoading, loggedInUserId, navigate]);

  useEffect(() => {
    // Obsługa zamykania dropdowna
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

  if (authLoading) return <div>Ładowanie autoryzacji...</div>;
  if (loading) return <div>Ładowanie profilu...</div>;
  if (!userData) return <div>Nie znaleziono użytkownika!</div>;

  return (
    <div className="main-content">
      {/* Navigation */}
      <nav className="navbar navbar-top navbar-expand-md navbar-dark" id="navbar-main">
        <div className="container-fluid">
          <a
            className="h4 mb-0 text-uppercase d-none d-lg-inline-block"
            href="https://www.creative-tim.com/product/argon-dashboard"
            target="_blank"
            rel="noreferrer"
          >
            User profile
          </a>
          <form className="navbar-search navbar-search-dark form-inline mr-3 d-none d-md-flex ml-lg-auto">
            <div className="form-group mb-0">
              <div className="input-group input-group-alternative">
                <div className="input-group-prepend">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                </div>
                <input className="form-control" placeholder="Search" type="text" />
              </div>
            </div>
          </form>
          <ul className="navbar-nav align-items-center d-none d-md-flex">
            <li className="nav-item dropdown">
              <a
                className="nav-link pr-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
              >
                <div className="media align-items-center">
                  <span className="avatar avatar-sm rounded-circle">
                      <img src={userData.photoURL || DEFAULT_AVATAR} className="rounded-circle" alt="Profile" />
                  </span>
                  <div className="media-body ml-2 d-none d-lg-block">
                    <span className="mb-0 text-sm font-weight-bold">{userData.displayName}</span>
                  </div>
                </div>
              </a>
              <div className={`dropdown-menu dropdown-menu-arrow dropdown-menu-right ${isDropdownOpen ? "visible" : "hidden"}`}>
                <div className="dropdown-header noti-title">
                  <h6 className="text-overflow m-0">Welcome!</h6>
                </div>
                <a href="../examples/profile.html" className="dropdown-item">
                  <i className="ni ni-single-02"></i>
                  <span>My profile</span>
                </a>
                <a href="../examples/profile.html" className="dropdown-item">
                  <i className="ni ni-settings-gear-65"></i>
                  <span>Settings</span>
                </a>
                <a href="../examples/profile.html" className="dropdown-item">
                  <i className="ni ni-calendar-grid-58"></i>
                  <span>Activity</span>
                </a>
                <a href="../examples/profile.html" className="dropdown-item">
                  <i className="ni ni-support-16"></i>
                  <span>Support</span>
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

      <div className="container-fluid mt--8">
        <div className="row">
          <div className="col-xl-4 order-xl-2 mb-5 mb-xl-0">
            <div className="card card-profile shadow">
              <div className="row justify-content-center">
                <div className="col-lg-3 order-lg-2">
                  <div className="card-profile-image">
                    <a href="#!">
                      <img src={userData.photoURL || DEFAULT_AVATAR} className="rounded-circle" alt="Profile" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="card-header text-center border-0 pt-8 pt-md-4 pb-0 pb-md-4">
                <div className="d-flex justify-content-between">
                  <a href="#!" className="btn btn-sm btn-info mr-4">
                    Connect
                  </a>
                  <a href="#!" className="btn btn-sm btn-default float-right">
                    Message
                  </a>
                </div>
              </div>
              <div className="card-body pt-0 pt-md-5">
                <div className="text-center">
                  <h3>
                    {userData.displayName}
                    <span className="font-weight-light">, {userData.birthDate || "N/A"}</span>
                  </h3>
                  <div className="h5 font-weight-300">
                    <i className="ni location_pin mr-2"></i>
                    {userData.location || "Brak lokalizacji"}
                  </div>
                  <div className="h5 mt-4">
                    <i className="ni business_briefcase-24 mr-2"></i>
                    Last seen: {userData.status === "Online" ? "Now" : formatLastSeen(userData.lastSeen)}

                  </div>
                  <div>
                    <i className="ni education_hat mr-2"></i>
                    Member since {userData.createdAt || "N/A"}
                  </div>
                  <hr className="my-4" />
                  <p>{userData.aboutMe || "Brak opisu"}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-8 order-xl-1">
            <div className="card bg-secondary shadow">
              <div className="card-header bg-white border-0">
                <div className="row align-items-center">
                  <div className="col-8">
                    <h3 className="mb-0">My account</h3>
                  </div>
                  <div className="col-4 text-right">
                    <a href="#!" className="btn btn-sm btn-primary">
                      Settings
                    </a>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <form>
                  <h6 className="heading-small text-muted mb-4">User information</h6>
                  <div className="pl-lg-4">
                    <div className="row">
                      <div className="col-lg-6">
                        <div className="form-group focused">
                          <label className="form-control-label" htmlFor="input-username">
                            Username
                          </label>
                          <input
                            type="text"
                            id="input-username"
                            className="form-control form-control-alternative"
                            placeholder={`Insert new username or stay ${userData.displayName}`}
                            defaultValue={userData.displayName}
                          />
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="form-group">
                          <label className="form-control-label" htmlFor="input-bday">
                            My birth date
                          </label>
                          <input
                            type="text"
                            id="input-bday"
                            className="form-control form-control-alternative"
                            placeholder={userData.birthDate || "Brak daty urodzenia"}
                            defaultValue={userData.birthDate || ""}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-lg-6">
                        <div className="form-group focused">
                          <label className="form-control-label" htmlFor="input-favorite-color">
                            Favorite color
                          </label>
                          <input
                            type="text"
                            id="input-favorite-color"
                            className="form-control form-control-alternative"
                            placeholder="Font color"
                            defaultValue={userData.fontColor || ""}
                          />
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="form-group focused">
                          <label className="form-control-label" htmlFor="input-location">
                            Location
                          </label>
                          <input
                            type="text"
                            id="input-location"
                            className="form-control form-control-alternative"
                            placeholder="Your location (not necessary real)"
                            defaultValue={userData.location || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr className="my-4" />
                  <h6 className="heading-small text-muted mb-4">About me</h6>
                  <div className="pl-lg-4">
                    <div className="form-group focused">
                      <label>About Me</label>
                      <textarea
                        rows={4}
                        className="form-control form-control-alternative"
                        placeholder="A few words about you ..."
                        defaultValue={userData.aboutMe || ""}
                      ></textarea>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;