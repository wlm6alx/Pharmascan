import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class UserService {
  // 👇 Instance Supabase
  static final _supabase = Supabase.instance.client;

  // ════════════════════════════════════════════════════════
  // SECTION LOCAL — Gestion fichier JSON
  // ════════════════════════════════════════════════════════

  static Future<File> _getFichier() async {
    final repertoire = await getApplicationDocumentsDirectory();
    final fichier = File('${repertoire.path}/UsersData.json');

    if (!await fichier.exists()) {
      try {
        final contenuAsset = await rootBundle.loadString(
          'asset/UsersData.json',
        );
        await fichier.writeAsString(contenuAsset);
      } catch (e) {
        await fichier.writeAsString('[]');
      }
    }
    return fichier;
  }

  static Future<List<Users>> chargerUsers() async {
    try {
      final fichier = await _getFichier();
      final contenu = await fichier.readAsString();
      final List data = json.decode(contenu);
      return data.map((e) => Users.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  static Future<bool> _sauvegarderLocalement(Users user) async {
    try {
      final users = await chargerUsers();
      final doublon = users.any(
        (u) => u.email.toLowerCase() == user.email.toLowerCase(),
      );
      if (doublon) return false;

      final int prochainId = users.isEmpty
          ? 1
          : (int.tryParse(users.last.id) ?? users.length) + 1;

      final userAvecId = user.copyWith(id: prochainId.toString());
      users.add(userAvecId);

      final fichier = await _getFichier();
      await fichier.writeAsString(
        json.encode(users.map((u) => u.toJson()).toList()),
      );
      return true;
    } catch (e) {
      print("❌ Erreur sauvegarde locale : $e");
      return false;
    }
  }

  static Future<bool> modifierUser(Users userModifie) async {
    try {
      final users = await chargerUsers();
      final int index = users.indexWhere((u) => u.id == userModifie.id);
      if (index == -1) return false;

      final bool emailDejaUtilise = users.any(
        (u) =>
            u.id != userModifie.id &&
            u.email.toLowerCase() == userModifie.email.toLowerCase(),
      );
      if (emailDejaUtilise) return false;

      users[index] = userModifie;
      final fichier = await _getFichier();
      await fichier.writeAsString(
        json.encode(users.map((u) => u.toJson()).toList()),
      );
      return true;
    } catch (e) {
      print("❌ Erreur modification : $e");
      return false;
    }
  }

  // ════════════════════════════════════════════════════════
  // SECTION SUPABASE — Auth directe
  // ════════════════════════════════════════════════════════

  // 👇 Inscription Supabase + fallback local
  static Future<Map<String, dynamic>> inscrireUser(Users nouveauUser) async {
    try {
      final AuthResponse res = await _supabase.auth.signUp(
        email: nouveauUser.email,
        password: nouveauUser.password,
        data: {
          'username': nouveauUser.username,
          'name': nouveauUser.name,
          'surname': nouveauUser.surename,
          if (nouveauUser.phone.isNotEmpty) 'phone': nouveauUser.phone,
          'role': nouveauUser.role,
          //  'userstate': nouveauUser.userstate,
        },
      );

      if (res.user != null) {
        print("✅ Inscription Supabase réussie");
        // Sauvegarde aussi localement
        await _sauvegarderLocalement(nouveauUser.copyWith(id: res.user!.id));
        return {'succes': true, 'source': 'supabase'};
      }

      return {'succes': false, 'message': 'Inscription échouée'};
    } on AuthException catch (e) {
      print("⚠️ Erreur Supabase : ${e.message}");

      // Fallback local si Supabase indisponible
      if (e.message.contains('network') || e.message.contains('connection')) {
        final succes = await _sauvegarderLocalement(nouveauUser);
        return {
          'succes': succes,
          'source': 'local',
          'message': succes ? null : 'Email déjà utilisé',
        };
      }

      return {'succes': false, 'message': e.message};
    } catch (e) {
      print("❌ Erreur inscription : $e");
      // Fallback local
      final succes = await _sauvegarderLocalement(nouveauUser);
      return {
        'succes': succes,
        'source': 'local',
        'message': succes ? null : 'Erreur inscription',
      };
    }
  }
}
