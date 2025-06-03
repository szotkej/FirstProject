// src\components\HomeBackground.tsx

import React, { useRef } from 'react';
import '../styles/HomeBackground.css';

const HomeBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="home-background-container">
      <div className="home-background-video">
        <video ref={videoRef} autoPlay loop muted>
          <source src="/assets/HomeBackground.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
};

export default HomeBackground;
