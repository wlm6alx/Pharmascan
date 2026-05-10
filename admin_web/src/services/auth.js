import { supabase } from '../supabase';

// Service d'authentification Supabase
class AuthService {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
  }

  // S'abonner aux changements d'authentification
  onAuthStateChange(callback) {
    this.listeners.push(callback);
    
    // Retourner la fonction de désabonnement
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notifier tous les listeners
  notifyListeners(user) {
    this.listeners.forEach(callback => callback(user));
  }

  // Connexion avec email et mot de passe
  async signIn(email, password) {
    try {
      console.log('🔐 Tentative de connexion...');
      console.log('Email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ Erreur de connexion:', error.message);
        throw error;
      }

      console.log('✅ Connexion réussie:', data);
      
      // Récupérer les infos de l'utilisateur depuis la table users
      if (data.user) {
        await this.fetchUserProfile(data.user.id);
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Erreur signIn:', error);
      return { success: false, error: error.message };
    }
  }

  // Récupérer le profil utilisateur depuis la table users
  async fetchUserProfile(userId) {
    try {
      console.log('👤 Récupération du profil utilisateur...');
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erreur profil:', error.message);
        return null;
      }

      console.log('✅ Profil utilisateur:', profile);
      
      this.user = { ...profile, authUser: profile };
      this.isAuthenticated = true;
      this.notifyListeners(this.user);
      
      return profile;
    } catch (err) {
      console.error('❌ Erreur fetchUserProfile:', err);
      return null;
    }
  }

  // Déconnexion
  async signOut() {
    try {
      console.log('🚪 Déconnexion...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Erreur déconnexion:', error.message);
        throw error;
      }

      console.log('✅ Déconnexion réussie');
      
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners(null);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur signOut:', error);
      return { success: false, error: error.message };
    }
  }

  // Vérifier si l'utilisateur est admin
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn() {
    return this.isAuthenticated && this.user;
  }

  // Obtenir l'utilisateur courant
  getCurrentUser() {
    return this.user;
  }

  // Initialiser l'authentification (au chargement de l'app)
  async initialize() {
    try {
      console.log('🔄 Initialisation auth...');
      
      // Écouter les changements d'état d'authentification
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Changement état auth:', event, session);
          
          if (session?.user) {
            await this.fetchUserProfile(session.user.id);
          } else {
            this.user = null;
            this.isAuthenticated = false;
            this.notifyListeners(null);
          }
        }
      );

      // Vérifier la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await this.fetchUserProfile(session.user.id);
      }

      return subscription;
    } catch (error) {
      console.error('❌ Erreur initialize:', error);
    }
  }

  // Créer un utilisateur avec rôle admin (pour les inscriptions)
  async createAdminUser(email, password, name, surname, username = null) {
    try {
      console.log('👨‍💼 Création admin user...');
      
      // 1. Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            surname,
            username: username || email.split('@')[0]
          }
        }
      });

      if (authError) {
        console.error('❌ Erreur création auth:', authError);
        return { success: false, error: authError.message };
      }

      console.log('✅ Utilisateur auth créé:', authData);

      // 2. Créer le profil dans la table users avec rôle admin
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          username: username || email.split('@')[0],
          name,
          surname,
          email,
          role: 'admin',
          userState: true,
          created_at: new Date().toISOString()
        }])
        .select();

      if (profileError) {
        console.error('❌ Erreur création profil:', profileError);
        return { success: false, error: profileError.message };
      }

      console.log('✅ Profil admin créé:', profileData);
      return { success: true, data: profileData[0] };

    } catch (err) {
      console.error('❌ Erreur création admin:', err);
      return { success: false, error: err.message };
    }
  }
}

// Exporter une instance singleton
export const authService = new AuthService();
export default authService;
