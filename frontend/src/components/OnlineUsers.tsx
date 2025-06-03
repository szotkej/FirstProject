// src\components\OnlineUsers.tsx

import React, { useState, useEffect, useContext } from "react";
//import { db } from "../firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import '../styles/OnlineUsers.css';

const crowdIcon = "/assets/crowd.png";

interface User {
  id: string;
  username: string;
  avatar: string;
}

const OnlineUsers: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // 🔹 Flaga, czy dane są załadowane
  const { uid } = useContext(UserContext) || {}; 
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const users = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || "Unknown",
            avatar: data.avatar || "/assets/default_avatar.jpg",
            isOnline: data.isOnline || false,
          };
        })
        .filter((user) => user.isOnline && user.id !== uid);

      setOnlineUsers(users);
      setIsLoaded(true); // 🔹 Ustawiamy, że dane są gotowe
    });

    return () => unsubscribe();
  }, [uid]);

  // 🔹 Nie otwieramy menu, jeśli dane jeszcze się ładują
  const handleOpen = () => {
    if (isLoaded) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="online-users-container">
      <div className="icon-wrapper" onClick={handleOpen}>
        <img src={crowdIcon} alt="Online Users" className="crowd-icon" />
      </div>
      {isOpen && isLoaded && ( // 🔹 Menu pokazuje się tylko jeśli isLoaded === true
        <div className="online-users-dropdown">
          <h3 className="dropdown-title">Online Users</h3>
          <ul className="user-list">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((user) => (
                <li key={user.id} className="user-item" onClick={() => navigate(`/player?id=${user.id}`)}>
                  <img src={user.avatar} alt={user.username} className="user-avatar" />
                  <span className="user-name">{user.username}</span>
                </li>
              ))
            ) : (
              <li className="no-users">No users online</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OnlineUsers;
