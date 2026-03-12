import 'dart:convert';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:flutter/services.dart';

class serviceD_authentification {
  static Future<bool> login(String nomUtilisateur, String password) async {
    final String response = await rootBundle.loadString('asset/UsersData.json');
    final List data = json.decode(response);
    final users = data.map((e) => Users.fromJson(e)).toList();

    for (final user in users) {
      if (user.nomUtilisateur == nomUtilisateur && user.password == password) {
        return true;
      }
    }
    return false;
  }
}
