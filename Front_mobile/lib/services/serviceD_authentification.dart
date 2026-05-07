import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/InscriptionService.dart';

class serviceD_authentification {
  static Users? _utilisateurConnecte;

  static Future<bool> login(String nomUtilisateur, String password) async {
    final List<Users> users = await UserService.chargerUsers();

    for (final user in users) {
      if (user.nomUtilisateur == nomUtilisateur &&
          user.password == password) {
        _utilisateurConnecte = user;
        return true;
      }
    }
    return false;
  }

  static Users? get utilisateurConnecte => _utilisateurConnecte;

  static Future<Users?> getUtilisateurConnecte() async {
    if (_utilisateurConnecte == null) return null;

    final List<Users> users = await UserService.chargerUsers();
    for (final user in users) {
      if (user.id == _utilisateurConnecte!.id) {
        _utilisateurConnecte = user;
        return user;
      }
    }

    _utilisateurConnecte = null;
    return null;
  }

  static Future<void> logout() async {
    _utilisateurConnecte = null;
  }
}
