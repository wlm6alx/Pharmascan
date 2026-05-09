import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/services/pharmacyService.dart';

class MedicineSearchService {
  static const String _defaultStockView = 'pharmacy_medicine_stock';

  static Future<List<Pharmacie>> rechercherPharmaciesParMedicament(
    String query,
  ) async {
    final recherche = query.trim();
    if (recherche.isEmpty) return [];

    if (_supabaseEstConfigure) {
      return _rechercherDansSupabase(recherche);
    }

    return PharmacyService.rechercherParMedicamentLocal(recherche);
  }

  static bool get _supabaseEstConfigure {
    return _supabaseUrl.isNotEmpty && _supabaseAnonKey.isNotEmpty;
  }

  static String get _supabaseUrl {
    return dotenv.env['SUPABASE_URL']?.trim().replaceAll(RegExp(r'/$'), '') ??
        '';
  }

  static String get _supabaseAnonKey {
    return dotenv.env['SUPABASE_ANON_KEY']?.trim() ?? '';
  }

  static String get _stockView {
    return dotenv.env['SUPABASE_STOCK_VIEW']?.trim().isNotEmpty == true
        ? dotenv.env['SUPABASE_STOCK_VIEW']!.trim()
        : _defaultStockView;
  }

  static Future<List<Pharmacie>> _rechercherDansSupabase(String query) async {
    final uri = Uri.parse('$_supabaseUrl/rest/v1/$_stockView').replace(
      queryParameters: {
        'select':
            'pharmacie_id,pharmacie_nom,adresse,latitude,longitude,telephone,medicament_nom,quantite',
        'medicament_nom': 'ilike.*$query*',
        'quantite': 'gt.0',
        'order': 'pharmacie_nom.asc',
      },
    );

    final response = await http.get(
      uri,
      headers: {
        'apikey': _supabaseAnonKey,
        'Authorization': 'Bearer $_supabaseAnonKey',
        'Accept': 'application/json',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Erreur Supabase ${response.statusCode}');
    }

    final List data = json.decode(response.body);
    final pharmacies = data
        .map((e) => Pharmacie.fromSupabaseStock(e as Map<String, dynamic>))
        .where((pharmacie) => pharmacie.nom.isNotEmpty)
        .toList();

    return _supprimerDoublons(pharmacies);
  }

  static List<Pharmacie> _supprimerDoublons(List<Pharmacie> pharmacies) {
    final ids = <String>{};
    final resultats = <Pharmacie>[];

    for (final pharmacie in pharmacies) {
      final cle =
          pharmacie.id ??
          '${pharmacie.nom.toLowerCase()}-${pharmacie.adresse.toLowerCase()}';

      if (ids.add(cle)) {
        resultats.add(pharmacie);
      }
    }

    return resultats;
  }
}
