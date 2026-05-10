import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:pharmascan/modele/ModelePharmacie.dart';

class PharmacyService {
  static Future<List<Pharmacie>> loadPharmacies() async {
    try {
      final String contenu = await rootBundle.loadString('asset/data.json');
      final List data = json.decode(contenu);
      return data.map((e) => Pharmacie.fromJson(e)).toList();
    } catch (e) {
      print("❌ Erreur chargement pharmacies : $e");
      return [];
    }
  }

  //Recherche dans la base JSON locale
  static Future<List<Pharmacie>> rechercherLocal(String query) async {
    try {
      final String contenu = await rootBundle.loadString('asset/data.json');
      final List data = json.decode(contenu);
      final pharmacies = data.map((e) => Pharmacie.fromJson(e)).toList();

      final resultats = pharmacies
          .where(
            (p) =>
                p.name.toLowerCase().contains(query.toLowerCase()) ||
                p.adress.toLowerCase().contains(query.toLowerCase()),
          )
          .toList();

      print("✅ Local: ${resultats.length} pharmacies trouvées pour '$query'");
      return resultats;
    } catch (e) {
      print("❌ Erreur rechercherLocal : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> rechercherParMedicamentLocal(
    String query,
  ) async {
    try {
      final String contenu = await rootBundle.loadString('asset/data.json');
      final List data = json.decode(contenu);
      final pharmacies = data.map((e) => Pharmacie.fromJson(e)).toList();
      final recherche = query.trim().toLowerCase();

      return pharmacies.where((pharmacie) {
        return pharmacie.medicaments.any(
          (medicament) => medicament.toLowerCase().contains(recherche),
        );
      }).toList();
    } catch (e) {
      print("Erreur rechercherParMedicamentLocal : $e");
      return [];
    }
  }

  // Ajout des fonctions de recherche via Nominatim OSM
  static Future<List<Pharmacie>> rechercherNominatim(String query) async {
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?q=$query+pharmacie'
        '&format=json'
        '&limit=5'
        '&countrycodes=cm', // permet de restreindre les recherches au cameroun
      );

      final response = await http.get(
        uri,
        headers: {'User-Agent': 'PharmaScan/1.0 (com.pharmascan)'},
      );

      if (response.statusCode != 200) return [];

      final List data = json.decode(response.body);
      return data.map((e) => Pharmacie.fromNominatim(e)).toList();
    } catch (e) {
      return [];
    }
  }

  // Combine la recherche dans la base de données de pharmascan et celle de OSM
  static Future<List<Pharmacie>> rechercher(String query) async {
    final local = await rechercherLocal(query);
    final nominatim = await rechercherNominatim(query);

    // Fusion des 2 résultats en évitans les doublons
    final tous = [...local];
    for (final p in nominatim) {
      final doublon = tous.any(
        (existing) => existing.name.toLowerCase() == p.name.toLowerCase(),
      );
      if (!doublon) tous.add(p);
    }
    return tous;
  }
}
