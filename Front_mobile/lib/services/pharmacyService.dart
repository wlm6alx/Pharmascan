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

      return pharmacies
          .where(
            (p) =>
                p.nom.toLowerCase().contains(query.toLowerCase()) ||
                p.adresse.toLowerCase().contains(query.toLowerCase()),
          )
          .toList();
    } catch (e) {
      return [];
    }
  }

  // Ajour des fonctions de recherche via Nominatim OSM
  static Future<List<Pharmacie>> rechercherNominatim(String query) async {
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?q=$query+pharmacie'
        '&format=json'
        '&limit=5'
        '&countrycodes=cm', // 👈 restreint au Cameroun
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

    // Fusionne sans doublons
    final tous = [...local];
    for (final p in nominatim) {
      final doublon = tous.any(
        (existing) => existing.nom.toLowerCase() == p.nom.toLowerCase(),
      );
      if (!doublon) tous.add(p);
    }
    return tous;
  }
}
