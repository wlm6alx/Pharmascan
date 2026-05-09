import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String? id;
  final String nom;
  final String adresse;
  final LatLng position;
  final String? telephone;
  final bool source;
  final List<String> medicaments;
  final String? medicamentTrouve;
  final int? stockDisponible;

  Pharmacie({
    this.id,
    required this.nom,
    required this.adresse,
    required this.position,
    this.telephone,
    required this.source,
    this.medicaments = const [],
    this.medicamentTrouve,
    this.stockDisponible,
  });

  factory Pharmacie.fromJson(Map<String, dynamic> json) {
    return Pharmacie(
      id: json['id']?.toString(),
      nom: json['nom'],
      adresse: json['adresse'] ?? '',
      position: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      telephone: json['telephone'],
      source: true,
      medicaments: List<String>.from(json['medicaments'] ?? []),
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

  factory Pharmacie.fromSupabaseStock(Map<String, dynamic> json) {
    final nomPharmacie =
        json['pharmacie_nom'] ?? json['nom_pharmacie'] ?? json['nom'];
    final nomMedicament =
        json['medicament_nom'] ?? json['nom_medicament'] ?? json['medicament'];

    return Pharmacie(
      id: (json['pharmacie_id'] ?? json['id_pharmacie'] ?? json['id'])
          ?.toString(),
      nom: nomPharmacie?.toString() ?? '',
      adresse: json['adresse']?.toString() ?? '',
      position: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      telephone: json['telephone']?.toString(),
      source: true,
      medicamentTrouve: nomMedicament?.toString(),
      stockDisponible: int.tryParse(
        (json['quantite'] ?? json['stock'] ?? json['stock_disponible'] ?? '')
            .toString(),
      ),
    );
  }
}
