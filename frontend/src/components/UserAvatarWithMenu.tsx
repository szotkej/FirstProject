// src\components\UserAvatarWithMenu.tsx

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import '../styles/UserAvatarWithMenu.css';

interface UserAvatarWithMenuProps {
  avatar?: string;
  status: 'online' | 'offline' | 'AFK';
}

const UserAvatarWithMenu: React.FC<UserAvatarWithMenuProps> = ({ avatar, status }) => {
  const navigate = useNavigate();
  const { username, avatar: userAvatarUrl, status: userStatus, uid } = useContext(UserContext) || {};
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const displayAvatarUrl = avatar || userAvatarUrl || '/assets/default_avatar.jpg';
  const displayUsername = username || `Guest${userAvatarUrl?.slice(0, 6) || '0000'}`;
  const displayStatus = userStatus || status;

  const handleAvatarClick = () => setIsMenuOpen(!isMenuOpen);
  const goToProfile = () => {
    if (uid) {
      navigate(`/player`);
    }
  };

  return (
    <div className="avatar-container" onClick={handleAvatarClick}>
      <div className="avatar-wrapper">
        <div className="avatar-image" style={{ backgroundImage: `url(${displayAvatarUrl})` }}></div>
        <div className={`status-indicator ${displayStatus}`}></div>
      </div>

      {isMenuOpen && displayUsername && (
        <div className="menu-dropdown">
          <div className="menu-content">
            <div className="username">{displayUsername}</div>
            <div className="menu-links">
              <button onClick={goToProfile}>Mój profil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatarWithMenu;
