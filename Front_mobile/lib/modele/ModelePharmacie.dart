import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String nom;
  final String adresse;
  final LatLng position;
  final String? telephone;
  final bool source;

  Pharmacie({
    required this.nom,
    required this.adresse,
    required this.position,
    this.telephone,
    required this.source,
  });

  factory Pharmacie.fromJson(Map<String, dynamic> json) {
    return Pharmacie(
      nom: json['nom'],
      adresse: json['adresse'] ?? '',
      position: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      telephone: json['telephone'],
      source: true,
    );
  }

  factory Pharmacie.fromNominatim(Map<String, dynamic> json) {
    return Pharmacie(
      nom: json['display_name'].toString().split(',').first,
      adresse: json['display_name'],
      position: LatLng(double.parse(json['lat']), double.parse(json['lon'])),
      source: false,
    );
  }
}
