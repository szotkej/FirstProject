// src\components\LobbyBackground.tsx

import React, { useRef } from 'react';
import '../styles/LobbyBackground.css';

const LobbyBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="lobby-background-container">
      <div className="lobby-background-video">
        <video ref={videoRef} autoPlay loop muted>
          <source src="/assets/LobbyBackground.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
};

export default LobbyBackground;
