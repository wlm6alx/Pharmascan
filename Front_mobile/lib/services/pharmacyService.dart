import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:pharmascan/modele/pharmacy.dart';

class PharmacyService {
  static Future<List<Pharmacy>> loadPharmacies() async {
    final String response = await rootBundle.loadString('asset/data.json');

    final List data = json.decode(response);

    return data.map((e) => Pharmacy.fromJson(e)).toList();
  }
}
