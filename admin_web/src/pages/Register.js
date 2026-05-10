import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/images/Logo.jpg';
import authService from '../services/auth';

const VERT = '#4ecdc4';
const VERT_FONCE = '#2bb5aa';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    surname: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.username || !formData.name || !formData.surname || !formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Création de l\'admin:', formData.email);
      
      const result = await authService.createAdminUser(
        formData.email,
        formData.password,
        formData.name,
        formData.surname,
        formData.username
      );
      
      if (result.success) {
        console.log('✅ Admin créé avec succès');
        
        // Connexion automatique après création
        const loginResult = await authService.signIn(formData.email, formData.password);
        
        if (loginResult.success) {
          navigate('/dashboard');
        } else {
          setError('Compte créé mais erreur de connexion automatique');
        }
      } else {
        // Gestion spécifique du rate limit
        if (result.error && result.error.includes('rate limit')) {
          setError('Trop de tentatives. Attends 5 minutes ou utilise un autre email.');
        } else {
          setError(result.error || 'Erreur lors de la création du compte');
        }
      }
    } catch (err) {
      console.error('❌ Erreur création admin:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleRegister();
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
        <h2 style={styles.title}>Créer un compte administrateur</h2>

        {/* Champ username */}
        <label style={styles.label}>Nom d'utilisateur</label>
        <input
          style={styles.input}
          placeholder="Choisir un nom d'utilisateur"
          name="username"
          value={formData.username}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />

        {/* Champ nom */}
        <label style={styles.label}>Nom</label>
        <input
          style={styles.input}
          placeholder="Entrer votre nom"
          name="name"
          value={formData.name}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />

        {/* Champ prénom */}
        <label style={styles.label}>Prénom</label>
        <input
          style={styles.input}
          placeholder="Entrer votre prénom"
          name="surname"
          value={formData.surname}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />

        {/* Champ email */}
        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          placeholder="Entrer votre email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />

        {/* Champ mot de passe */}
        <label style={styles.label}>Mot de passe</label>
        <div style={styles.passwordBox}>
          <input
            style={styles.passwordInput}
            placeholder="Choisir un mot de passe (min 6 caractères)"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
          />
          <span
            style={styles.eyeIcon}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {/* Champ confirmation mot de passe */}
        <label style={styles.label}>Confirmer le mot de passe</label>
        <div style={styles.passwordBox}>
          <input
            style={styles.passwordInput}
            placeholder="Confirmer votre mot de passe"
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
          />
          <span
            style={styles.eyeIcon}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </span>
        </div>

        {/* Message d'erreur */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Bouton inscription */}
        <button
          style={styles.button}
          onClick={handleRegister}
          onMouseOver={(e) => e.target.style.backgroundColor = VERT_FONCE}
          onMouseOut={(e) => e.target.style.backgroundColor = VERT}
        >
          {loading ? 'Création en cours...' : 'Créer le compte administrateur'}
        </button>

        <p style={styles.loginText}>
          Vous avez déjà un compte ?{' '}
          <span 
            style={styles.loginLink} 
            onClick={() => navigate('/')}
          >
            Se connecter
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
    padding: '40px 50px',
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
    width: 150,
    height: 150,
    objectFit: 'contain',
  },
  title: {
    fontSize: 22,
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
    marginBottom: 12,
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
    marginBottom: 12,
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
  loginText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#555',
  },
  loginLink: {
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
