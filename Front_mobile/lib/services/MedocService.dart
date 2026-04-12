import 'package:pharmascan/modele/modeleMedocs.dart';
import 'dart:async';
import 'package:flutter/services.dart';
import 'dart:convert';

class Medocservice {
static Future<List<Medoc>> loadMedocs() async {
  final String reponse = await rootBundle.loadString('asset/medoc.json');
  final List data = json.decode(reponse);
  return data.map((e) => Medoc.fromJson(e)).toList();
}

}