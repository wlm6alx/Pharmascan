  import 'dart:convert';
  import 'dart:io';
  import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
  import 'package:pharmascan/modele/modeleUser.dart';

  class UserService {

    // Pour s'assurrer que j'écris bel et bien sur le bon fichier Json
    static Future<File> _getFichier() async {
      final repertoire = await getApplicationDocumentsDirectory();
      final fichier= File('${repertoire.path}/UsersData.json');
 //A retirer après heun humm
      print("📁 Chemin fichier : ${fichier.path}");
      print("📁 Fichier existe : ${await fichier.exists()}");

      if (!await fichier.exists()){
       try{
         final ContenuAsset = await rootBundle.loadString('asset/UsersData.json');
         await fichier.writeAsString(ContenuAsset);
         print("📁 Fichier créé depuis asset ✅");
       }catch(e){
         await fichier.writeAsString('[]');
         print("fichier créé vide");
       }
      }
      return fichier ;
    }


    static Future<List<Users>> chargerUsers() async {
      try {
        final fichier = await _getFichier();
        final contenu = await fichier.readAsString();

        print("📂 Contenu du fichier : $contenu");

        final List data = json.decode(contenu);
        return data.map((e) => Users.fromJson(e)).toList();
      } catch (e) {
        return [];
      }
    }

    // 👇 Vérifie si l'email est déjà utilisé
    static Future<bool> emailExiste(String email) async {
      final users = await chargerUsers();
      return users.any((u) => u.email.toLowerCase() == email.toLowerCase());
    }

    // 👇 Enregistre un nouveau user dans le JSON
    static Future<bool> inscrireUser(Users nouveauUser) async {
      try {
        final users = await chargerUsers();

        print("👥 Users existants : ${users.length}");
        print("📧 Email à inscrire : ${nouveauUser.email}");

        // Vérifions d'abord les doublons

        final doublon = users.any(
                (u) => u.email.toLowerCase() == nouveauUser.email.toLowerCase()
        );

        print("🔍 Doublon trouvé : $doublon");
        if (doublon) {
          return false;
        }

        final int prochainId = users.isEmpty
            ? 1
            : (int.parse(users.last.id) + 1);

        // 👇 Crée le user avec le bon ID
        final userAvecId = Users(
          id: prochainId.toString(),
          nomUtilisateur: nouveauUser.nomUtilisateur,
          email: nouveauUser.email,
          password: nouveauUser.password,
        );
        users.add(userAvecId);

        final fichier = await _getFichier();
        final contenuAEcrire = json.encode(
          users.map((u) => u.toJson()).toList(),
        );

        print("✏️ Contenu à écrire : $contenuAEcrire");

        await fichier.writeAsString(contenuAEcrire);
        // 👇 Vérifie immédiatement après écriture
        final verification = await fichier.readAsString();
        print("✅ Contenu après écriture : $verification");
        return true;

      } catch (e) {
        print("❌ Erreur inscription : $e");
        print("❌ Stack trace : ${StackTrace.current}");
        return false;
      }
    }
  }