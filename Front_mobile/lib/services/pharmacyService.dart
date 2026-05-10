import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PharmacyService {
  static final _supabase = Supabase.instance.client;
  static const double _rayonKm = 3.0;

  static double calculerDistance(LatLng point1, LatLng point2) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Kilometer, point1, point2);
  }

  static String calculerDistanceAffichage(LatLng depart, LatLng arrivee) {
    final distance = calculerDistance(depart, arrivee);
    if (distance < 1) return "${(distance * 1000).round()} m";
    return "${distance.toStringAsFixed(1)} km";
  }

  static Future<List<Pharmacie>> _chargerSupabase(LatLng position) async {
    try {
      final data = await _supabase
          .from('pharmacie')
          .select('*')
          .eq('validate', true)
          .eq('exist', true);

      return (data as List).map((e) => Pharmacie.fromSupabase(e)).where((p) {
        try {
          return calculerDistance(position, p.position) <= _rayonKm;
        } catch (_) {
          return false;
        }
      }).toList();
    } catch (e) {
      print("Erreur Supabase pharmacies : $e");
      return [];
    }
  }

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
      print("Erreur JSON local pharmacies : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> _chargerNominatim(LatLng position) async {
    try {
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
      print("Erreur Nominatim : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> loadPharmacies(LatLng position) async {
    final resultats = await Future.wait([
      _chargerSupabase(position),
      _chargerLocal(position),
      _chargerNominatim(position),
    ]);

    final fusion = <String, Pharmacie>{};

    for (final p in resultats[0]) {
      fusion[_cleDeduplication(p)] = p;
    }
    for (final p in resultats[1]) {
      fusion.putIfAbsent(_cleDeduplication(p), () => p);
    }
    for (final p in resultats[2]) {
      final cle = _cleDeduplication(p);
      final existeDeja = fusion.values.any(
        (exist) => calculerDistance(exist.position, p.position) < 0.1,
      );
      if (!fusion.containsKey(cle) && !existeDeja) fusion[cle] = p;
    }

    final liste = fusion.values.toList();
    liste.sort(
      (a, b) => calculerDistance(
        position,
        a.position,
      ).compareTo(calculerDistance(position, b.position)),
    );

    return liste;
  }

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
      print("Erreur rechercherLocal : $e");
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
      print("Erreur rechercherNominatim : $e");
      return [];
    }
  }

  static Future<List<Pharmacie>> rechercher(
    String query, {
    LatLng? position,
  }) async {
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

    final supabaseFiltree = supabase
        .where(
          (p) =>
              p.name.toLowerCase().contains(query.toLowerCase()) ||
              p.adress.toLowerCase().contains(query.toLowerCase()),
        )
        .toList();

    final fusion = <String, Pharmacie>{};

    for (final p in supabaseFiltree) {
      fusion[_cleDeduplication(p)] = p;
    }
    for (final p in local) {
      fusion.putIfAbsent(_cleDeduplication(p), () => p);
    }
    for (final p in nominatim) {
      fusion.putIfAbsent(_cleDeduplication(p), () => p);
    }

    final liste = fusion.values.toList();

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

  static String _cleDeduplication(Pharmacie p) {
    final nomNormalise = p.name
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), '')
        .replaceAll(RegExp(r'[^a-z0-9]'), '');
    final lat = p.position.latitude.toStringAsFixed(3);
    final lon = p.position.longitude.toStringAsFixed(3);
    return "${nomNormalise}_${lat}_${lon}";
  }
}
