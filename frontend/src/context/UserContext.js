import { jsx as _jsx } from "react/jsx-runtime";
// frontend/src/context/UserContext.tsx
import { createContext, useState, useEffect, useContext, useRef } from "react";
import { initializeApp } from "firebase/app";
import { signInWithCustomToken, getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
import firebaseConfig from "@/firebase/firebaseConfig";
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const API_URL = "https://firstproject-backend.onrender.com/api";
//const API_URL = "http://localhost:3001/api";
export const UserContext = createContext(undefined);
export const UserProvider = ({ children }) => {
    const fetchedRef = useRef(false); // flag, czy już pobraliśmy dane
    const firstEvent = useRef(true);
    const [userData, setUserData] = useState({
        uid: null,
        displayName: null,
        createdAt: null,
        lastSeen: null,
        photoURL: null,
        location: null,
        fontColor: null,
        birthDate: null,
        status: "Offline",
        loading: true,
    });
    useEffect(() => {
        async function initAuth() {
            console.log("[UserContext] 🔧 Rozpoczynam initAuth");
            // 1) ustawiamy persistence
            try {
                console.log("[UserContext] ⏳ Ustawiam persistence");
                await setPersistence(auth, browserLocalPersistence);
                console.log("[UserContext] ✅ Persistence ustawione");
            }
            catch (e) {
                console.error("[UserContext]❌ Błąd ustawiania persistence:", e);
            }
            // 2) sprawdzamy natychmiast currentUser
            const current = auth.currentUser;
            console.log("[UserContext] currentUser po persistence:", current);
            if (current) {
                // mamy już sesję → fetch danych
                const token = await current.getIdToken();
                await fetchUserData(current.uid, token);
            }
            else {
                // nie ma sesji → anon login
                console.log("[UserContext] Brak currentUser → anon login");
                await anonymousLogging();
            }
            // 3) rejestrujemy listener na przyszłe zmiany (np. wylog)
            onAuthStateChanged(auth, async (user) => {
                console.log("[UserContext] 🔄 onAuthStateChanged callback, user=", user);
                if (user) {
                    // ktoś się zalogował lub przywrócono sesję
                    const token = await user.getIdToken();
                    localStorage.setItem("authToken", token);
                    await fetchUserData(user.uid, token);
                }
                else {
                    // ktoś się wylogował – możesz tu wyczyścić state
                    setUserData(prev => ({ ...prev, uid: null, status: "Offline" }));
                }
            });
        }
        initAuth();
    }, []);
    // Logowanie anonimowe
    const anonymousLogging = async () => {
        try {
            const response = await fetch(`${API_URL}/auth/anonymous`, { method: "POST" });
            const data = await response.json();
            if (data.token && data.uid) {
                // Zaloguj użytkownika przy użyciu custom tokena
                await signInWithCustomToken(auth, data.token);
                localStorage.setItem("authToken", data.token);
            }
            else {
                throw new Error("Nieprawidłowa odpowiedź z API autoryz  acji");
            }
        }
        catch (error) {
            console.error("[UserContext]❌ Błąd logowania anonimowego:", error);
            setUserData((prev) => ({ ...prev, loading: false }));
        }
    };
    // Funkcja pobierająca dane użytkownika z API
    const fetchUserData = async (uid, token) => {
        if (!uid || !token)
            return;
        if (fetchedRef.current) {
            console.log("[UserContext]Dane użytkownika zostały już pobrane");
            return;
        }
        fetchedRef.current = true; // ustawiamy flagę, że pobieranie zostało uruchomione
        //console.log("Pobieranie danych użytkownika...");
        setUserData((prev) => ({ ...prev, loading: true }));
        try {
            const response = await fetch(`${API_URL}/profile/${uid}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok)
                throw new Error(`Błąd HTTP: ${response.status}`);
            const userDataFromAPI = await response.json();
            setUserData((prev) => ({
                ...prev,
                uid,
                displayName: userDataFromAPI.displayName || "Guest",
                createdAt: userDataFromAPI.createdAt || null,
                lastSeen: userDataFromAPI.lastSeen || null,
                photoURL: userDataFromAPI.photoURL || null,
                location: userDataFromAPI.location || null,
                fontColor: userDataFromAPI.fontColor || null,
                birthDate: userDataFromAPI.birthDate || null,
                status: userDataFromAPI.status || "Offline",
                loading: false,
            }));
        }
        catch (error) {
            console.error("[UserContext]Błąd podczas pobierania danych użytkownika:", error);
            setUserData((prev) => ({ ...prev, loading: false }));
        }
    };
    return (_jsx(UserContext.Provider, { value: { ...userData }, children: !userData.loading && children }));
};
export const useAuth = () => {
    const context = useContext(UserContext);
    //console.log("UserContext::", context);
    if (!context)
        throw new Error("useAuth must be used within a UserProvider");
    return context;
};
