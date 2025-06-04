import { jsx as _jsx } from "react/jsx-runtime";
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/UserContext';
const GeneralChat = () => {
    const location = useLocation();
    const { uid, displayName, photoURL } = useAuth(); // Pobieramy dane użytkownika z kontekstu
    // Jeśli nie jesteśmy w lobby lub użytkownik nie jest zalogowany, nie renderuj czatu
    if (location.pathname !== '/lobby' || !uid) {
        return null;
    }
    return (_jsx("div", { children: _jsx("h1", { children: "Chat w Lobby" }) }));
};
export default GeneralChat;
