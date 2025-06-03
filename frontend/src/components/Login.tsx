import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // Upewnij się, że firebaseConfig eksportuje auth oraz db
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from "firebase/firestore";
//import '../styles/Login.css';

const getEmailForUsername = async (username: string): Promise<string | null> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Zakładając, że tylko jeden użytkownik może mieć dany username
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Zwrócenie emaila użytkownika
      return userData.email;
    } else {
      return null; // Jeśli użytkownik nie zostanie znaleziony
    }
  } catch (error) {
    console.error("Error retrieving email for username:", error);
    return null; // Zwrócenie null w przypadku błędu
  }
};

const getUsernameByEmail = async (email: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Zakładając, że tylko jeden użytkownik może mieć dany email
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      
      // Zwrócenie username użytkownika
      return userData.username;
    } else {
      return null; // Jeśli użytkownik nie zostanie znaleziony
    }
  } catch (error) {
    console.error("Error retrieving username:", error);
    return null; // Błąd w przypadku problemu z zapytaniem
  }
};

const isUserInFirestore = async (email: string) => {
  const username = await getUsernameByEmail(email);
    if (username) {
      return(true); 
    } else {
      return(false);
    }
};

const Login: React.FC = () => {
  // Stany dla formularza logowania
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Stany dla formularza rejestracji
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const [error, setError] = useState<string>('');
  const [isLogin, setIsLogin] = useState(true);

  // Nowe stany dla wysłanego emaila i odliczania
  const [emailSent, setEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();


  const toggleForm = () => {
    setError('');
    setIsLogin(!isLogin);
    if (emailSent){
      setSignupEmail('');
      setSignupUsername('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setResendTimer(0);
      setEmailSent(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailToUse = loginIdentifier;
    // Jeśli identyfikator nie zawiera "@", traktuj go jako username
    if (!loginIdentifier.includes('@')) {
      try {
        let temporary = await getEmailForUsername(loginIdentifier);
        if (temporary === null) {

        } else {
          emailToUse = temporary;
        }
      } catch (err) {
        setError('Login error');
        return;
      }
    }
    signInWithEmailAndPassword(auth, emailToUse, loginPassword)
      .then((userCredential) => {
        console.log('Zalogowano:', userCredential.user);
        navigate('/lobby');
      })
      .catch((error) => {
        setError('Błąd logowania: ' + error.message);
        console.error('Błąd logowania:', error.message);
      });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signupPassword !== signupConfirmPassword) {
      setError('The passwords do not match!');
      return;
    }
    if (signupUsername.includes("@")) {
      setError('The username cannot includes @');
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const user = userCredential.user;
  
      // Ustawienie displayName na wpisany username
      await updateProfile(user, { displayName: signupUsername });
  
      // Wysłanie emaila weryfikacyjnego
      await sendEmailVerification(user);

      // Ustaw stan, że email został wysłany i rozpocznij odliczanie 60 sekund
      setEmailSent(true);
      setResendTimer(60);
    } catch (error: any) {

      const userExists = await isUserInFirestore(signupEmail);
      if (userExists) {
        setError('You have already account on this email.');
      } else {
        setError('Registration error: ' + error.message);
      }
    }
    
  };

  // Efekt odliczania dla przycisku resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);  

  // Funkcja ponownego wysłania emaila weryfikacyjnego
  const handleResendVerification = async () => {
    if (signupUsername.includes("@")) {
      setError('The username cannot includes @');
      return;
    }
    if (await isUserInFirestore(signupEmail)) {
        setError('You have already account on this email.');
        return;
      } 
    try {
      let user = auth.currentUser;
  
      // Jeśli użytkownik jest niezalogowany, spróbuj go zalogować przed wysłaniem maila
      if (!user) {
        const userCredential = await signInWithEmailAndPassword(auth, signupEmail, signupPassword);
        user = userCredential.user;
      }
  
      if (user) {
        await user.reload(); // Odśwież dane użytkownika
        if (user.emailVerified) {
          setError("Your email has already been verified.");
          return;
        }
  
        await sendEmailVerification(user);
        setEmailSent(true);
        setResendTimer(60);
      } 
    } catch (error: any) {
      setError("Resend email error: " + error.message);
    }
  };
  
  return (
    <div className="wrapper">
      <div className="form-container">
        <div className="slide-controls">
          <input type="radio" name="slide" id="login" checked={isLogin} onChange={toggleForm} />
          <input type="radio" name="slide" id="signup" checked={!isLogin} onChange={toggleForm} />
          <label htmlFor="login" className="slide login">Login</label>
          <label htmlFor="signup" className="slide signup">Signup</label>
          <div className="slider-tab" style={{ left: isLogin ? '0%' : '50%' }}></div>
        </div>
        <div 
          className="form-inner"  
          style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(-50%)', transition: 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}
        >
          {/* Formularz logowania */}
          <form onSubmit={handleLogin} className="login">
            <div className="field">
              <input
                type="text"
                placeholder="Email or Username"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            <div className="field">
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            {error && <p className="text-red-600">{error}</p>}
            <div className="field btn">
              <div className="btn-layer"></div>
              <input type="submit" value="Log in" className="bg-blue-500 text-white rounded px-6 py-2" />
            </div>
          </form>
          {/* Formularz rejestracji */}
          <form onSubmit={handleSignup} className="signup">
            <div className="field">
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            <div className="field">
              <input
                type="text"
                placeholder="Username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            <div className="field">
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            <div className="field">
              <input
                type="password"
                placeholder="Confirm Password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                required
                className="border rounded px-4 py-2 w-80"
              />
            </div>
            {error && <p className="text-red-600">{error}</p>}
            <div className="field btn button-group">
              <div className="btn-layer"></div>
              <input
                type="submit"
                value="Sign Up"
                className={`btn-signup ${emailSent ? 'inactive' : ''}`}
              />
              <button
                onClick={handleResendVerification}
                disabled={resendTimer > 0}
                className={`resend-email ${emailSent ? 'active' : ''} ${resendTimer > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {resendTimer > 0 ? `Resend email (${resendTimer})` : 'Resend email'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
