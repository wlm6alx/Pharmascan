import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/InscriptionService.dart';

class serviceD_authentification {
  static Future<bool> login(String nomUtilisateur, String password) async {

    // 👇 Lit depuis le fichier sur l'appareil (même source que l'inscription)
    final List<Users> users = await UserService.chargerUsers();

    for (final user in users) {
      if (user.nomUtilisateur == nomUtilisateur &&
          user.password == password) {
        return true;
      }
    }
    return false;
  }
}