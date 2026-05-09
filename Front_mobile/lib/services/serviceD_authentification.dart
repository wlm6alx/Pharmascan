import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/userService.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ServiceDAuthentification {
  static final _supabase = Supabase.instance.client;
  static Users? _utilisateurConnecte;

  // ════════════════════════════════════════════════════════
  // LOGIN — Supabase d'abord, fallback local ensuite
  // ════════════════════════════════════════════════════════

  static Future<bool> login(String email, String password) async {
    try {
      // 👇 Supabase auth utilise email + password
      // On cherche d'abord l'email depuis le username
      //final email = await _trouverEmailParUsername(email);
      /*
      if (email == null) {
        print("⚠️ Username introuvable → fallback local");
        return await _loginLocal(email, password);
      }
*/
      final AuthResponse res = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (res.user != null) {
        _utilisateurConnecte = Users(
          id: res.user!.id,
          username: email,
          email: res.user!.email ?? '',
          password: '',
          token: res.session?.accessToken,
          role: '',
          userstate: true,
          name: '',
          surename: '',
          phone: '',
        );
        //print("✅ Connexion Supabase réussie");
        return true;
      }

      return false;
    } on AuthException catch (e) {
      //  print("⚠️ Erreur Supabase : ${e.message}");

      // Fallback local si réseau indisponible
      if (e.message.contains('network') || e.message.contains('connection')) {
        return await _loginLocal(email, password);
      }
      return false;
    } catch (e) {
      //  print("⚠️ Erreur → fallback local : $e");
      return await _loginLocal(email, password);
    }
  }

  // 👇 Cherche l'email depuis le username dans la table users
  /* static Future<String?> _trouverEmailParUsername(String nomUtilisateur) async {
    try {
      final data = await _supabase
          .from('users')
          .select('email')
          .eq('nomUtilisateur', nomUtilisateur)
          .single();
      return data['email'] as String?;
    } catch (e) {
      // Cherche aussi dans le fichier local
      final users = await UserService.chargerUsers();
      final user = users
          .where((u) => u.nomUtilisateur == nomUtilisateur)
          .firstOrNull;
      return user?.email;
    }
  }*/

  // ════════════════════════════════════════════════════════
  // LOGIN LOCAL — Fallback fichier JSON
  // ════════════════════════════════════════════════════════

  static Future<bool> _loginLocal(String email, String password) async {
    final List<Users> users = await UserService.chargerUsers();
    for (final user in users) {
      if (user.username == email && user.password == password) {
        _utilisateurConnecte = user;
        //print("✅ Connexion locale réussie");
        return true;
      }
    }
    //print("❌ Connexion échouée");
    return false;
  }

  // ════════════════════════════════════════════════════════
  // LOGOUT
  // ════════════════════════════════════════════════════════

  static Future<void> logout() async {
    try {
      await _supabase.auth.signOut();
      //print("✅ Déconnexion effectuée");
    } catch (e) {
      //print("⚠️ Erreur logout Supabase : $e");
    }
    _utilisateurConnecte = null;
  }

  // ════════════════════════════════════════════════════════
  // GETTERS
  // ════════════════════════════════════════════════════════

  static Users? get utilisateurConnecte => _utilisateurConnecte;

  static Future<Users?> getUtilisateurConnecte() async {
    if (_utilisateurConnecte == null) return null;

    try {
      // Rafraîchit depuis Supabase
      final user = _supabase.auth.currentUser;
      if (user != null) {
        _utilisateurConnecte = _utilisateurConnecte!.copyWith(
          email: user.email,
        );
        return _utilisateurConnecte;
      }
    } catch (e) {
      //print("⚠️ Erreur récupération profil : $e");
    }

    // Fallback local
    final users = await UserService.chargerUsers();
    for (final user in users) {
      if (user.id == _utilisateurConnecte!.id) {
        _utilisateurConnecte = user;
        return user;
      }
    }

    _utilisateurConnecte = null;
    return null;
  }

  static Future<String?> getToken() async {
    return _supabase.auth.currentSession?.accessToken;
  }
}
