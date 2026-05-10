import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String? pharmacie_id;
  final String name;
  final String adress;
  final LatLng position;
  final String? phone_number;
  final bool source;
  final List<String> medicaments;
  final String? medicamentTrouve;
  final int? stockDisponible;

  Pharmacie({
    this.pharmacie_id,
    required this.name,
    required this.adress,
    required this.position,
    this.phone_number,
    required this.source,
    this.medicaments = const [],
    this.medicamentTrouve,
    this.stockDisponible,
  });

  factory Pharmacie.fromJson(Map<String, dynamic> json) {
    return Pharmacie(
      pharmacie_id: json['id']?.toString(),
      name: json['nom'],
      adress: json['adresse'] ?? '',
      position: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      phone_number: json['telephone'],
      source: true,
      medicaments: List<String>.from(json['medicaments'] ?? []),
    );
  }

  factory Pharmacie.fromNominatim(Map<String, dynamic> json) {
    return Pharmacie(
      name: json['display_name'].toString().split(',').first,
      adress: json['adresse'] ?? '',
      position: LatLng(double.parse(json['lat']), double.parse(json['lon'])),
      source: false,
    );
  }

  factory Pharmacie.fromSupabaseStock(Map<String, dynamic> json) {
    final nomPharmacie =
        json['pharmacie_nom'] ??
        json['nom_pharmacie'] ??
        json['name'] ??
        json['nom'];
    final nomMedicament =
        json['medicament_nom'] ??
        json['nom_medicament'] ??
        json['medicament'] ??
        json['nom'];

    return Pharmacie(
      pharmacie_id: (json['pharmacie_id'] ?? json['id_pharmacie'] ?? json['id'])
          ?.toString(),
      name: nomPharmacie?.toString() ?? '',
      adress: (json['adresse'] ?? json['adress'])?.toString() ?? '',
      position: LatLng(
        double.parse(json['latitude'].toString()),
        double.parse(json['longitude'].toString()),
      ),
      phone_number: (json['telephone'] ?? json['phone_number'] ?? json['phone'])
          ?.toString(),
      source: true,
      medicamentTrouve: nomMedicament?.toString(),
      stockDisponible: int.tryParse(
        (json['quantite'] ?? json['stock'] ?? json['stock_disponible'] ?? '')
            .toString(),
      ),
    );
  }
}
