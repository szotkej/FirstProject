import { jsx as _jsx } from "react/jsx-runtime";
// frontend\src\main.tsx
//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';
createRoot(document.getElementById('root')).render(_jsx(App, {}));
