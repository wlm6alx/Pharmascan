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

  // Récupérer le profil utilisateur depuis le JWT (pas de requête users)
  async fetchUserProfile(userId) {
    try {
      console.log('👤 Récupération du profil utilisateur depuis JWT...');
      console.log('🔍 UserID:', userId);
      
      // Récupérer la session et les métadonnées
      console.log('🔍 Récupération de la session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Erreur session:', sessionError);
        return null;
      }
      
      if (!session) {
        console.log('❌ Pas de session');
        return null;
      }
      
      console.log('✅ Session trouvée:', session);
      const user = session.user;
      console.log('🔍 User dans session:', user);
      console.log('🔍 App metadata:', user?.app_metadata);
      console.log('🔍 User metadata:', user?.user_metadata);
      
      const role = user?.app_metadata?.role || user?.user_metadata?.role;
      console.log('🔍 Rôle extrait:', role);
      
      // Créer un profil virtuel depuis le JWT
      const profile = {
        id: user.id,
        email: user.email,
        role: role || 'user',
        userState: true, // Par défaut actif
        created_at: user.created_at,
        // Ajouter les autres champs si disponibles dans les métadonnées
        ...(user.app_metadata || {}),
        ...(user.user_metadata || {})
      };
      
      console.log('✅ Profil depuis JWT:', profile);
      console.log('🔍 Rôle dans profil:', profile?.role);
      
      this.user = { ...profile, authUser: profile };
      this.isAuthenticated = true;
      this.notifyListeners(this.user);
      
      console.log('✅ User défini dans authService:', this.user);
      console.log('✅ isAdmin() après fetch:', await this.isAdmin());
      
      return profile;
    } catch (err) {
      console.error('❌ Erreur fetchUserProfile:', err);
      console.error('❌ Stack trace:', err.stack);
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

  // Vérifier si l'utilisateur est admin (uniquement depuis le JWT)
  async isAdmin() {
    const role = await this.getRoleFromJWT();
    console.log('🔍 Rôle depuis JWT:', role);
    const isAdmin = role === 'admin';
    console.log('🔍 Est admin?', isAdmin);
    return isAdmin;
  }

  // Récupérer le rôle depuis le JWT (app_metadata)
  async getRoleFromJWT() {
    try {
      // Récupérer la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ Pas de session active');
        return null;
      }
      
      const user = session.user;
      // Priorité à app_metadata (plus sécurisé)
      const role = user?.app_metadata?.role || user?.user_metadata?.role;
      
      console.log('🔍 Session user:', user);
      console.log('🔍 App metadata:', user?.app_metadata);
      console.log('🔍 User metadata:', user?.user_metadata);
      console.log('🔍 Rôle trouvé:', role);
      
      return role;
    } catch (error) {
      console.error('❌ Erreur lecture JWT:', error);
      return null;
    }
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
      
      // 1. Créer l'utilisateur dans Supabase Auth avec rôle admin dans les métadonnées
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            surname,
            username: username || email.split('@')[0],
            role: 'admin'  // Rôle pour le trigger handle_new_user()
          },
          email_confirm: true  // Auto-confirmation (nécessite service role)
        }
      });

      if (authError) {
        console.error('❌ Erreur création auth:', authError);
        return { success: false, error: authError.message };
      }

      console.log('✅ Utilisateur auth créé:', authData);

      // 2. Le trigger handle_new_user() crée automatiquement le profil dans public.users
      // Plus besoin de création manuelle - le trigger gère tout !
      console.log('✅ Profil admin créé automatiquement par le trigger');
      
      return { success: true, data: authData.user };

    } catch (err) {
      console.error('❌ Erreur création admin:', err);
      return { success: false, error: err.message };
    }
  }
}

// Exporter une instance singleton
export const authService = new AuthService();
export default authService;
