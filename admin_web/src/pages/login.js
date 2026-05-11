import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/Logo.jpg';
import authService from '../services/auth';

const VERT = '#4ecdc4';
const VERT_FONCE = '#2bb5aa';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
    const navigate = useNavigate();

  // Vérifier si déjà connecté
  useEffect(() => {
    if (authService.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Connexion avec Supabase
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setError('');

    try {
      const result = await authService.signIn(username, password);
      
      if (result.success) {
        const isAdmin = await authService.isAdmin();
        if (isAdmin) {
          navigate('/dashboard');
        } else {
          setError('Accès réservé aux administrateurs');
          await authService.signOut();
        }
      } else {
        setError(result.error || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  };

  // Connexion avec la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={styles.page}>

      {/* Partie gauche - Formulaire */}
      <div style={styles.left}>

        {/* Logo centré */}
        <div style={styles.logoContainer}>
          <img src={logo} alt="PharmaScan" style={styles.logo} />
        </div>

        {/* Titre centré */}
        <h2 style={styles.title}>Se connecter</h2>

        {/* Champ email */}
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          placeholder="Entrer votre email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={handleKeyPress}
        />

        {/* Champ mot de passe */}
        <label style={styles.label}>Mot de passe</label>
        <div style={styles.passwordBox}>
          <input
            style={styles.passwordInput}
            placeholder="Entrer votre mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <span
            style={styles.eyeIcon}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {/* Mot de passe oublié */}
        <p style={styles.forgotPassword}>Mot de passe oublié ?</p>

        {/* Message d'erreur */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Bouton connexion */}
        <button
          style={styles.button}
          onClick={handleLogin}
          onMouseOver={(e) => e.target.style.backgroundColor = VERT_FONCE}
          onMouseOut={(e) => e.target.style.backgroundColor = VERT}
        >
          Se connecter
        </button>

        <p style={styles.registerText}>
          vous n'avez pas de compte ?{' '}
          <span 
            style={styles.registerLink}
            onClick={() => navigate('/register')}
          >
            créez un nouveau compte
          </span>
        </p>

      </div>

      {/* Partie droite - Bloc vert */}
      <div style={styles.right} />

    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
  },
  left: {
    width: '45%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 50px',
    backgroundColor: '#fff',
  },
  right: {
    width: '55%',
    backgroundColor: VERT,
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 200,
    height: 200,
    objectFit: 'contain',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#222',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 15,
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    boxSizing: 'border-box',
  },
  passwordBox: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    marginBottom: 5,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: 'transparent',
    outline: 'none',
  },
  eyeIcon: {
    cursor: 'pointer',
    fontSize: 16,
  },
  forgotPassword: {
    textAlign: 'right',
    color: VERT,
    fontSize: 13,
    cursor: 'pointer',
    marginBottom: 20,
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: VERT,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    cursor: 'pointer',
    marginBottom: 15,
  },
  registerText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#555',
  },
  registerLink: {
    color: VERT,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
};