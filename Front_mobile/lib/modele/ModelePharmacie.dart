import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String pharmacie_id;
  final String name;
  final String adress;
  final String? pays;
  final String? ville;
  final String? quartier;
  final String? validate;
  final String? latitude;
  final String? longitude;
  final LatLng position;
  final String? phone_number;
  final bool estOuverte;
  final String source; // 'supabase' ou 'local'

  Pharmacie({
    required this.pharmacie_id,
    required this.name,
    required this.adress,
    this.pays,
    this.ville,
    this.quartier,
    this.validate,
    this.phone_number,
    this.latitude,
    this.longitude,
    required this.position,
    this.estOuverte = true,
    this.source = 'local',
  });
  factory Pharmacie.fromJson(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;

    return Pharmacie(
      pharmacie_id: json['id']?.toString() ?? '',
      name: json['nom'] ?? 'Pharmacie Inconnue',
      adress: json['adresse'] ?? 'Adresse non spécifiée',
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      phone_number: json['telephone'],
      estOuverte: json['estOuverte'] ?? true,
      source: 'local',
      ville: json['ville'],
      quartier: json['quartier'],
    );
  }

  factory Pharmacie.fromSupabase(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;

    return Pharmacie(
      pharmacie_id: json['pharmacie_id']?.toString() ?? '',
      name: json['name'] ?? 'Pharmacie Inconnue',
      adress: json['adress'] ?? 'Adresse non spécifiée',
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      phone_number: json['phone_number'],
      estOuverte: json['status'] == 'open',
      source: 'supabase',
      ville: json['ville'],
      quartier: json['quartier'],
      validate: json['validate']?.toString(),
    );
  }
  factory Pharmacie.fromNominatim(Map<String, dynamic> json) {
    final nomComplet = json['display_name'] as String? ?? '';
    final parties = nomComplet.split(',');
    final name = parties.isNotEmpty ? parties.first.trim() : 'Pharmacie';
    final adress = parties.length > 1
        ? parties.sublist(1).join(',').trim()
        : nomComplet;

    final lat = double.tryParse(json['lat']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['lon']?.toString() ?? '0') ?? 0.0;

    return Pharmacie(
      pharmacie_id: json['place_id']?.toString() ?? '',
      name: name,
      adress: adress,
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      estOuverte: true,
      source: 'osm',
    );
  }
}
