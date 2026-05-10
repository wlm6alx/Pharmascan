import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class Medocservice {
  static final _supabase = Supabase.instance.client;
  static const String _defaultTable = 'medicaments';
  static const String _defaultBarcodeColumn = 'code_barre';

  static Future<List<Medoc>> loadMedocs() async {
    final String reponse = await rootBundle.loadString('asset/medoc.json');
    final List data = json.decode(reponse);
    return data.map((e) => Medoc.fromJson(e)).toList();
  }

  static Future<VerificationMedicament> verifierCodeBarre(String code) async {
    final codeNormalise = code.trim();

    if (codeNormalise.isEmpty) {
      return VerificationMedicament.suspect(codeNormalise);
    }

    final data = await _supabase
        .from(_tableMedicaments)
        .select()
        .eq(_colonneCodeBarre, codeNormalise)
        .limit(1);

    if (data.isEmpty) {
      return VerificationMedicament.suspect(codeNormalise);
    }

    return VerificationMedicament.correct(
      code_barre: codeNormalise,
      json: Map<String, dynamic>.from(data.first),
    );
  }

  static String get _tableMedicaments {
    return dotenv.env['SUPABASE_MEDICAMENT_TABLE']?.trim().isNotEmpty == true
        ? dotenv.env['SUPABASE_MEDICAMENT_TABLE']!.trim()
        : _defaultTable;
  }

  static String get _colonneCodeBarre {
    return dotenv.env['SUPABASE_BARCODE_COLUMN']?.trim().isNotEmpty == true
        ? dotenv.env['SUPABASE_BARCODE_COLUMN']!.trim()
        : _defaultBarcodeColumn;
  }
}
