// src/Home.tsx

import { Link } from 'react-router-dom';
import './styles/Home.css';
import HomeBackground from "./components/HomeBackground";

function Home() {
  return (
  <div>
    <Link to="/lobby" className="lobby-link">
    <h1 className="lobby-text">Lobby</h1>
    </Link>
    </div>
  );
}

export default Home;
