import 'dart:convert';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/services/pharmacyService.dart';

class MedicineSearchException implements Exception {
  final String message;

  const MedicineSearchException(this.message);

  @override
  String toString() => message;
}

class MedicineSearchService {
  static const String _defaultSearchFunctionParam = 'm_medicament_name';

  static Future<List<Pharmacie>> rechercherPharmaciesParMedicament(
    String query,
  ) async {
    final recherche = query.trim();
    if (recherche.isEmpty) return [];

    if (_supabaseEstConfigure) {
      if (_searchFunction.isNotEmpty) {
        return _rechercherAvecFonctionSupabase(recherche);
      }
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

  static String get _searchFunction {
    return dotenv.env['SUPABASE_SEARCH_FUNCTION']?.trim() ?? '';
  }

  static String get _searchFunctionParam {
    return dotenv.env['SUPABASE_SEARCH_FUNCTION_PARAM']?.trim().isNotEmpty ==
            true
        ? dotenv.env['SUPABASE_SEARCH_FUNCTION_PARAM']!.trim()
        : _defaultSearchFunctionParam;
  }

  static Future<List<Pharmacie>> _rechercherAvecFonctionSupabase(
    String query,
  ) async {
    final uri = Uri.parse('$_supabaseUrl/rest/v1/rpc/$_searchFunction');

    final response = await http.post(
      uri,
      headers: {
        'apikey': _supabaseAnonKey,
        'Authorization': 'Bearer $_supabaseAnonKey',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: json.encode({_searchFunctionParam: query}),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw MedicineSearchException(_extraireMessageErreur(response.body));
    }

    final List data = json.decode(response.body);
    final pharmacies = data
        .map((e) => Pharmacie.fromSupabaseStock(e as Map<String, dynamic>))
        .where((pharmacie) => pharmacie.name.isNotEmpty)
        .toList();

    return _supprimerDoublons(pharmacies);
  }

  static String _extraireMessageErreur(String responseBody) {
    try {
      final decoded = json.decode(responseBody);
      if (decoded is Map<String, dynamic>) {
        final message = decoded['message'] ?? decoded['error_description'];
        if (message != null && message.toString().trim().isNotEmpty) {
          return message.toString();
        }
      }
    } catch (_) {
      if (responseBody.trim().isNotEmpty) return responseBody;
    }

    return "Impossible de rechercher ce medicament pour le moment.";
  }

  static List<Pharmacie> _supprimerDoublons(List<Pharmacie> pharmacies) {
    final ids = <String>{};
    final resultats = <Pharmacie>[];

    for (final pharmacie in pharmacies) {
      final cle =
          pharmacie.pharmacie_id ??
          '${pharmacie.name.toLowerCase()}-${pharmacie.adress.toLowerCase()}';

      if (ids.add(cle)) {
        resultats.add(pharmacie);
      }
    }

    return resultats;
  }
}
