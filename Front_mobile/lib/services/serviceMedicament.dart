import 'dart:convert';
import 'dart:io';

//import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class MedicineSearchException implements Exception {
  final String message;
  const MedicineSearchException(this.message);
}

class MedicamentAvecPharmacie {
  final Medoc medoc;
  final Pharmacie? pharmacie;
  MedicamentAvecPharmacie({required this.medoc, this.pharmacie});
}

class Medocservice {
  static final _supabase = Supabase.instance.client;

  // ════════════════════════════════════════════════════════
  // HISTORIQUE LOCAL — Sauvegarde sur le téléphone
  // ════════════════════════════════════════════════════════

  static Future<File> _getFichierHistorique() async {
    final repertoire = await getApplicationDocumentsDirectory();
    final fichier = File('${repertoire.path}/historique_scans.json');
    if (!await fichier.exists()) {
      await fichier.writeAsString('[]');
    }
    return fichier;
  }

  // 👇 Charge les 6 derniers scans depuis le stockage local
  static Future<List<Medoc>> loadMedocs() async {
    try {
      final fichier = await _getFichierHistorique();
      final contenu = await fichier.readAsString();
      final List data = json.decode(contenu);
      return data.map((e) => Medoc.fromJson(e)).toList();
    } catch (e) {
      print("❌ Erreur chargement historique : $e");
      return [];
    }
  }

  // 👇 Sauvegarde un scan dans l'historique local (max 6)
  static Future<void> sauvegarderScan(Medoc medoc) async {
    try {
      final historique = await loadMedocs();

      // Ajoute en tête et garde max 6
      final nouvelHistorique = [medoc, ...historique].take(6).toList();

      final fichier = await _getFichierHistorique();
      await fichier.writeAsString(
        json.encode(nouvelHistorique.map((m) => m.toJson()).toList()),
      );
    } catch (e) {
      print("❌ Erreur sauvegarde scan : $e");
    }
  }

  // ════════════════════════════════════════════════════════
  // VÉRIFICATION CODE BARRE — Supabase
  // ════════════════════════════════════════════════════════

  // 👇 Vérifie si un code barre existe dans Supabase
  static Future<VerificationMedicament> verifierCodeBarre(
    String codeBarre,
  ) async {
    try {
      final data = await _supabase
          .from('medicaments')
          .select('''
            *,
            pharmacie:pharmacie_id (
              pharmacie_id,
              name,
              adress,
              ville,
              quartier,
              phone_number,
              indicphone,
              latitude,
              longitude,
              status,
              validate,
              exist
            )
          ''')
          .eq('code_barre', codeBarre)
          .eq('visibility', true)
          .maybeSingle(); // 👈 retourne null si non trouvé

      if (data == null) {
        // Médicament non trouvé → suspect
        final verification = VerificationMedicament.suspect(codeBarre);

        // Sauvegarde dans l'historique
        await sauvegarderScan(Medoc.fromVerification(verification));
        return verification;
      }

      // Médicament trouvé → correct
      final verification = VerificationMedicament.correct(
        code_barre: codeBarre,
        json: data,
      );

      // Sauvegarde dans l'historique
      await sauvegarderScan(Medoc.fromVerification(verification));
      return verification;
    } catch (e) {
      print("❌ Erreur vérification code barre : $e");
      throw MedicineSearchException("Impossible de vérifier ce médicament.");
    }
  }

  // ════════════════════════════════════════════════════════
  // RECHERCHE PAR NOM — Supabase + pharmacie associée
  // ════════════════════════════════════════════════════════

  static Future<List<MedicamentAvecPharmacie>> rechercherMedicaments(
    String query,
  ) async {
    if (query.trim().isEmpty) return [];

    try {
      final data = await _supabase
          .from('medicaments')
          .select('''
            *,
            pharmacie:pharmacie_id (
              pharmacie_id,
              name,
              adress,
              ville,
              quartier,
              phone_number,
              indicphone,
              latitude,
              longitude,
              status,
              validate,
              exist
            )
          ''')
          .ilike('nom', '%$query%')
          .eq('visibility', true)
          .eq('disponible', true);

      return (data as List).map((json) {
        final medoc = Medoc.fromSupabase(json);
        Pharmacie? pharmacie;

        if (json['pharmacie'] != null) {
          try {
            pharmacie = Pharmacie.fromSupabase(
              json['pharmacie'] as Map<String, dynamic>,
            );
          } catch (_) {
            pharmacie = null;
          }
        }

        return MedicamentAvecPharmacie(medoc: medoc, pharmacie: pharmacie);
      }).toList();
    } catch (e) {
      print("❌ Erreur recherche médicaments : $e");
      throw MedicineSearchException(
        "Impossible de rechercher ce médicament pour le moment.",
      );
    }
  }
}
