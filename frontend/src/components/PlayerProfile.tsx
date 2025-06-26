// frontend\src\components\PlayerProfile.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/UserContext";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/PlayerProfile.css";
import { Timestamp } from "firebase/firestore";
import { SketchPicker } from "react-color";
import { useMemo } from "react";

interface UserData {
  displayName: string;
  photoURL: string;
  birthDate: string | null;
  location: string | null;
  createdAt: string | null;
  lastSeen: Timestamp | string | null;
  userDescription: string | null;
  fontColor: string | null;
  status: "Online" | "Offline" | "AFK";
}

const formatTimestamp = (ts: any): string => {
  if (!ts) return "N/A";
  try {
    let date: Date;

    if (typeof ts === "string") return ts; // już sformatowany string
    if (typeof ts.toDate === "function") date = ts.toDate();
    else if (typeof ts._seconds === "number") date = new Date(ts._seconds * 1000);
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    else return "Invalid date";

    return date.toLocaleDateString("pl-PL"); // <-- tylko dzień, miesiąc, rok
  } catch (err) {
    console.warn("Cannot format timestamp:", ts);
  }
  return "Invalid date";
};

const DEFAULT_AVATAR = "/assets/default_avatar.jpg";
const API_URL = import.meta.env.VITE_API_URL;

const PlayerProfile: React.FC = () => {
  const { uid: loggedInUserId, displayName, photoURL, status, lastSeen, createdAt, location, fontColor, birthDate, userDescription, loading: authLoading, updateUserData } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedBirthDate, setSelectedBirthDate] = useState<Date | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [initialUserData, setInitialUserData] = useState<UserData | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewAvatarURL, setPreviewAvatarURL] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const browserLocation = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;

    const searchParams = new URLSearchParams(browserLocation.search);
    const idFromParams = searchParams.get("id");
    const profileId = idFromParams || loggedInUserId;

    if (!profileId) {
      console.error("No profileId, redirecting...");
      navigate("/");
      return;
    }

    setProfileUserId(profileId);

    if (profileId === loggedInUserId) {
      const newUserData: UserData = {
        displayName: displayName || "",
        photoURL: photoURL || DEFAULT_AVATAR,
        birthDate: birthDate ?? null,
        location: location ?? null,
        createdAt: createdAt ?? null,
        lastSeen: lastSeen ?? null,
        userDescription: userDescription ?? null,
        fontColor: fontColor ?? null,
        status: status as "Online" | "Offline" | "AFK",
      };

      setUserData(newUserData);
      setInitialUserData(newUserData);
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("No authorization token");

        const response = await fetch(`${API_URL}/profile/${profileId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch profile");

        const userDataFromAPI: UserData = await response.json();
        console.log("dataUser from API", userDataFromAPI);
        setUserData(userDataFromAPI);
        setInitialUserData(userDataFromAPI);
        if (userDataFromAPI.birthDate) {
          setSelectedBirthDate(new Date(userDataFromAPI.birthDate));
        }
        if (userDataFromAPI.fontColor) {
          setSelectedColor(userDataFromAPI.fontColor);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authLoading, loggedInUserId, browserLocation.search, navigate]);

  const hasChanges = useMemo(() => {
    if (!initialUserData || !userData) return false;

    const usernameChanged = userData.displayName !== initialUserData.displayName;
    const usernameValid = userData.displayName.trim().length > 3;

    const userDescriptionChanged = userData.userDescription !== initialUserData.userDescription;
    const locationChanged = userData.location !== initialUserData.location;
    const birthDateChanged = userData.birthDate !== initialUserData.birthDate;
    const fontColorChanged = userData.fontColor !== initialUserData.fontColor;

    const otherChanges = userDescriptionChanged || locationChanged || birthDateChanged || fontColorChanged;

    if (usernameChanged && !usernameValid) {
      return false; 
    }

    return usernameChanged || otherChanges;
  }, [userData, initialUserData]);

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

const handleBirthDateChange = (date: Date | null) => {
  setSelectedBirthDate(date);
  if (userData) {
    setUserData({
      ...userData,
      birthDate: date 
        ? date.getFullYear() + '-' + 
          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
          String(date.getDate()).padStart(2, '0')
        : null,
    });
  }
};

  const handleImageClick = () => {
    if (profileUserId === loggedInUserId && fileInputRef.current) {
      fileInputRef.current.click(); // symulujemy kliknięcie inputa
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const validTypes = ["image/jpeg", "image/png"];
    const maxSize = 4 * 1024 * 1024; // 4 MB

    if (!validTypes.includes(file.type)) {
      alert("Only JPEG and PNG files are allowed.");
      return;
    }

    if (file.size > maxSize) {
      alert("File size cannot exceed 4 MB.");
      return;
    }

    setSelectedAvatarFile(file);
    setPreviewAvatarURL(URL.createObjectURL(file)); // Podgląd pliku

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Authorization token not found. Please log in again.");
        return;
      }
      const response = await fetch(`${API_URL}/profile/${loggedInUserId}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload avatar");

      const { photoURL: newPhotoURL } = await response.json();

      if (userData) {
        const updatedUser = { ...userData, photoURL: newPhotoURL };
        setUserData(updatedUser);
        setInitialUserData(updatedUser);
      }

      updateUserData({
        displayName: userData?.displayName || "",
        photoURL: newPhotoURL,
        birthDate: userData?.birthDate || null,
        location: userData?.location || null,
        fontColor: userData?.fontColor || null,
        userDescription: userData?.userDescription || null,
      });

    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar.");
    } finally {
      setUploading(false);
      setPreviewAvatarURL(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewAvatarURL) {
        URL.revokeObjectURL(previewAvatarURL);
      }
    };
  }, [previewAvatarURL]);

  const handleColorChange = (color: { hex: string }) => {
    setSelectedColor(color.hex);
    if (userData) {
      setUserData({
        ...userData,
        fontColor: color.hex,
      });
    }
  };

  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorPicker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("Authorization token not found. Please log in again.");
        return;
      }
      const response = await fetch(`${API_URL}/profile/${loggedInUserId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to update profile");

      updateUserData({
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        birthDate: userData.birthDate,
        location: userData.location,
        fontColor: userData.fontColor,
        userDescription: userData.userDescription,
      });

      alert("Profile updated successfully!");
      setInitialUserData(userData);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (authLoading) return <div>Loading authorization...</div>;
  if (loading) return <div>Loading profile...</div>;
  if (!userData) return <div>User not found!</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-image">
          <a href="#!" onClick={handleImageClick}>
            <img
              src={previewAvatarURL || userData.photoURL || DEFAULT_AVATAR}
              alt="Profile"
              style={{
                cursor: profileUserId === loggedInUserId ? "pointer" : "default",
                opacity: uploading ? 0.5 : 1,
                border: `4px solid ${userData.fontColor || "#000000"}`, // Dodajemy obramowanie w kolorze fontColor
                borderRadius: "50%", // Utrzymujemy zaokrąglenie
              }}
            />
            {uploading && <div className="loader">Uploading...</div>}
          </a>
          {profileUserId === loggedInUserId && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <button
                className="btn upload-avatar"
                onClick={handleImageClick}
                disabled={uploading}
              >
                Change Avatar
              </button>
            </>
          )}
        </div>
        <div className="profile-actions">
          <a href="#!" className="btn connect">Connect</a>
          <a href="#!" className="btn message">Message</a>
        </div>
        <div className="profile-info">
          <h3>{userData.displayName}<span>, {userData.birthDate || "N/A"}</span></h3>
          <p><i className="ni location_pin"></i>{userData.location || "No location"}</p>
          <p><i className="ni business_briefcase-24"></i>Last seen: {userData.status === "Online" ? "Now" : formatTimestamp(userData.lastSeen)}</p>
          <p><i className="ni education_hat"></i>Member since {formatTimestamp(userData.createdAt) || "N/A"}</p>
          <hr />
          <div className="user-description">{userData.userDescription || "No description"}</div>
        </div>
      </div>

      {profileUserId === loggedInUserId && (
        <div className="edit-card">
          <div className="card-header">
            <h3>My account</h3>
            <button type="submit" form="profile-form" className="btn apply" disabled={!hasChanges}>
              Apply Changes
            </button>
          </div>
          <div className="card-body">
            <form id="profile-form" onSubmit={handleSubmit}>
              <h4>User information</h4>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="input-username">Username</label>
                  <input
                    type="text"
                    id="input-username"
                    className="form-control"
                    placeholder={`Insert new username or stay ${userData.displayName}`}
                    value={userData.displayName}
                    onChange={(e) => setUserData({ ...userData, displayName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="input-bday">My birth date</label>
                  <DatePicker
                    id="input-bday"
                    selected={selectedBirthDate}
                    onChange={handleBirthDateChange}
                    className="form-control"
                    placeholderText="Select your birth date"
                    dateFormat="yyyy-MM-dd"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    maxDate={new Date()}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" ref={colorRef}>
                  <label htmlFor="input-favorite-color">Favorite color</label>
                  <input
                    type="text"
                    id="input-favorite-color"
                    readOnly
                    className="form-control"
                    value={selectedColor || userData.fontColor || "#000000"}
                    onClick={() => setShowColorPicker(true)}
                    style={{ cursor: "pointer", backgroundColor: selectedColor || userData.fontColor || "#000000", color: "#fff" }}
                  />
                  {showColorPicker && (
                    <div className="color-picker">
                      <SketchPicker
                        color={selectedColor || userData.fontColor || "#000000"}
                        onChange={handleColorChange}
                      />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="input-location">Location</label>
                  <input
                    type="text"
                    id="input-location"
                    className="form-control"
                    placeholder="Your location (not necessary real)"
                    value={userData.location || ""}
                    onChange={(e) => setUserData({ ...userData, location: e.target.value })}
                  />
                </div>
              </div>
              <hr />
              <h4>About me</h4>
              <div className="form-group">
                <label>About Me</label>
                <textarea
                  rows={4}
                  className="form-control"
                  placeholder="A few words about you ..."
                  value={userData.userDescription || ""}
                  onChange={(e) => setUserData({ ...userData, userDescription: e.target.value })}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfile;