import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PharmacyService {
  static final _supabase = Supabase.instance.client;
  static const double _rayonKm = 3.0;

  // ════════════════════════════════════════════════════════
  // Calcul de distance — Formule Haversine
  // ════════════════════════════════════════════════════════

  static double calculerDistance(LatLng point1, LatLng point2) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Kilometer, point1, point2);
  }

  static String calculerDistanceAffichage(LatLng depart, LatLng arrivee) {
    final distance = calculerDistance(depart, arrivee);
    if (distance < 1) return "${(distance * 1000).round()} m";
    return "${distance.toStringAsFixed(1)} km";
  }

  // ════════════════════════════════════════════════════════
  // SOURCE 1 — Supabase (priorité haute)
  // ════════════════════════════════════════════════════════

  static Future<List<Pharmacie>> _chargerSupabase(LatLng position) async {
    try {
      final data = await _supabase
          .from('pharmacie')
          .select('*')
          .eq('validate', true) // 👈 boolean true, pas String 'true'
          .eq('exist', true); // 👈 pharmacie doit exister

      return (data as List).map((e) => Pharmacie.fromSupabase(e)).where((p) {
        try {
          return calculerDistance(position, p.position) <= _rayonKm;
        } catch (_) {
          return false;
        }
      }).toList();
    } catch (e) {
      print("❌ Erreur Supabase pharmacies : $e");
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // SOURCE 2 — Fichier JSON local (fallback)
  // ════════════════════════════════════════════════════════

  static Future<List<Pharmacie>> _chargerLocal(LatLng position) async {
    try {
      final String contenu = await rootBundle.loadString('asset/data.json');
      final List data = json.decode(contenu);

      return data.map((e) => Pharmacie.fromJson(e)).where((p) {
        try {
          return calculerDistance(position, p.position) <= _rayonKm;
        } catch (_) {
          return false;
        }
      }).toList();
    } catch (e) {
      print("❌ Erreur JSON local pharmacies : $e");
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // SOURCE 3 — Nominatim OSM (complément)
  // ════════════════════════════════════════════════════════

  static Future<List<Pharmacie>> _chargerNominatim(LatLng position) async {
    try {
      // 👇 Bounding box autour de la position (≈ 3km)
      const double delta = 0.027;
      final double latMin = position.latitude - delta;
      final double latMax = position.latitude + delta;
      final double lonMin = position.longitude - delta;
      final double lonMax = position.longitude + delta;

      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?amenity=pharmacy'
        '&format=json'
        '&limit=20'
        '&bounded=1'
        '&viewbox=$lonMin,$latMax,$lonMax,$latMin',
      );

      final response = await http
          .get(
            uri,
            headers: {
              'User-Agent': 'PharmaScan/1.0 (com.pharmascan)',
              'Accept-Language': 'fr',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return [];

      final List data = json.decode(response.body);

      return data.map((e) => Pharmacie.fromNominatim(e)).where((p) {
        try {
          return calculerDistance(position, p.position) <= _rayonKm;
        } catch (_) {
          return false;
        }
      }).toList();
    } catch (e) {
      print("❌ Erreur Nominatim : $e");
      return [];
    }
  }

  // ════════════════════════════════════════════════════════
  // CHARGEMENT COMBINÉ — 3 sources en parallèle
  // ════════════════════════════════════════════════════════

  static Future<List<Pharmacie>> loadPharmacies(LatLng position) async {
    final resultats = await Future.wait([
      _chargerSupabase(position),
      _chargerLocal(position),
      _chargerNominatim(position),
    ]);

    final supabase = resultats[0];
    final local = resultats[1];
    final nominatim = resultats[2];

    print(
      "📊 Supabase: ${supabase.length} | Local: ${local.length} | OSM: ${nominatim.length}",
    );

    // 👇 Fusion avec priorité : Supabase > Local > OSM
    final Map<String, Pharmacie> fusion = {};

    for (final p in supabase) {
      fusion[_cleDeduplication(p)] = p;
    }
    for (final p in local) {
      final cle = _cleDeduplication(p);
      if (!fusion.containsKey(cle)) fusion[cle] = p;
    }
    for (final p in nominatim) {
      final cle = _cleDeduplication(p);
      // Pour OSM, on vérifie aussi si une pharmacie très proche existe déjà (même si le nom varie un peu)
      final existeDeja = fusion.values.any(
        (exist) => calculerDistance(exist.position, p.position) < 0.1, // 100m
      );
      if (!fusion.containsKey(cle) && !existeDeja) fusion[cle] = p;
    }

    // 👇 Tri par distance croissante
    final liste = fusion.values.toList();
    liste.sort(
      (a, b) => calculerDistance(
        position,
        a.position,
      ).compareTo(calculerDistance(position, b.position)),
    );

    print("✅ ${liste.length} pharmacies uniques dans ${_rayonKm}km");
    return liste;
  }

  // ════════════════════════════════════════════════════════
  // RECHERCHE — dans les 3 sources
  // ════════════════════════════════════════════════════════

  static Future<List<Pharmacie>> rechercherLocal(String query) async {
    try {
      final String contenu = await rootBundle.loadString('asset/data.json');
      final List data = json.decode(contenu);
      final pharmacies = data.map((e) => Pharmacie.fromJson(e)).toList();

      return pharmacies
          .where(
            (p) =>
                p.name.toLowerCase().contains(query.toLowerCase()) ||
                p.adress.toLowerCase().contains(query.toLowerCase()),
          )
          .toList();
    } catch (e) {
      print("❌ Erreur rechercherLocal : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> rechercherNominatim(String query) async {
    try {
      final uri = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?q=${Uri.encodeComponent(query)}+pharmacie'
        '&format=json'
        '&limit=10'
        '&countrycodes=cm',
      );

      final response = await http
          .get(
            uri,
            headers: {
              'User-Agent': 'PharmaScan/1.0 (com.pharmascan)',
              'Accept-Language': 'fr',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return [];

      final List data = json.decode(response.body);
      return data.map((e) => Pharmacie.fromNominatim(e)).toList();
    } catch (e) {
      print("❌ Erreur rechercherNominatim : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> rechercher(
    String query, {
    LatLng? position,
  }) async {
    // 👇 Si query vide et position fournie → charge les proches
    if (query.isEmpty && position != null) {
      return loadPharmacies(position);
    }

    final resultats = await Future.wait([
      rechercherLocal(query),
      rechercherNominatim(query),
      if (position != null) _chargerSupabase(position),
    ]);

    final local = resultats[0];
    final nominatim = resultats[1];
    final supabase = position != null ? resultats[2] : <Pharmacie>[];

    // Filtre supabase par nom aussi
    final supabaseFiltree = supabase
        .where(
          (p) =>
              p.name.toLowerCase().contains(query.toLowerCase()) ||
              p.adress.toLowerCase().contains(query.toLowerCase()),
        )
        .toList();

    // Fusion sans doublons
    final Map<String, Pharmacie> fusion = {};

    for (final p in supabaseFiltree) {
      fusion[_cleDeduplication(p)] = p;
    }
    for (final p in local) {
      final cle = _cleDeduplication(p);
      if (!fusion.containsKey(cle)) fusion[cle] = p;
    }
    for (final p in nominatim) {
      final cle = _cleDeduplication(p);
      if (!fusion.containsKey(cle)) fusion[cle] = p;
    }

    final liste = fusion.values.toList();

    // Tri par distance si position fournie
    if (position != null) {
      liste.sort(
        (a, b) => calculerDistance(
          position,
          a.position,
        ).compareTo(calculerDistance(position, b.position)),
      );
    }

    return liste;
  }

  // ════════════════════════════════════════════════════════
  // Clé de déduplication
  // ════════════════════════════════════════════════════════

  static String _cleDeduplication(Pharmacie p) {
    final nomNormalise = p.name
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), '')
        .replaceAll(RegExp(r'[^a-z0-9]'), '');
    // Ajout des coordonnées arrondies pour différencier les pharmacies de même nom
    final lat = p.position.latitude.toStringAsFixed(3);
    final lon = p.position.longitude.toStringAsFixed(3);
    return "${nomNormalise}_${lat}_${lon}";
  }
}
