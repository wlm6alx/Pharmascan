import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String pharmacie_id;
  final String name;
  final String adress;
  final String? pays;
  final String? ville;
  final String? quartier;
  final bool validate; // 👈 boolean dans SQL, pas String
  final bool exist; // 👈 nouveau champ du schéma
  final String? latitude;
  final String? longitude;
  final LatLng position;
  final String? phone_number; // 👈 bigint dans SQL → String pour l'affichage
  final String? indicphone; // 👈 nouveau champ indicatif téléphone
  final String status; // 👈 pharmacie_status enum
  final bool estOuverte;
  final String source;

  Pharmacie({
    required this.pharmacie_id,
    required this.name,
    required this.adress,
    this.pays,
    this.ville,
    this.quartier,
    this.validate = false,
    this.exist = false,
    this.phone_number,
    this.indicphone,
    this.latitude,
    this.longitude,
    required this.position,
    this.status = 'close',
    this.estOuverte = false,
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
      phone_number: json['telephone']?.toString(),
      estOuverte: json['estOuverte'] ?? true,
      status: json['status'] ?? 'close',
      source: 'local',
      ville: json['ville'],
      quartier: json['quartier'],
      pays: json['pays'],
      validate: json['validate'] ?? false,
      exist: json['exist'] ?? false,
    );
  }

  factory Pharmacie.fromSupabase(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;
    final status = json['status']?.toString() ?? 'close';

    return Pharmacie(
      pharmacie_id: json['pharmacie_id']?.toString() ?? '',
      name: json['name'] ?? 'Pharmacie Inconnue',
      adress: json['adress'] ?? 'Adresse non spécifiée',
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      // 👇 phone_number est bigint dans SQL → convertit en String
      phone_number: json['phone_number']?.toString(),
      indicphone: json['indicphone']?.toString(),
      estOuverte: status == 'open',
      status: status,
      source: 'supabase',
      ville: json['ville'],
      quartier: json['quartier'],
      pays: json['pays'],
      // 👇 validate est boolean dans SQL
      validate: json['validate'] == true,
      exist: json['exist'] == true,
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
      status: 'open',
      source: 'osm',
    );
  }
}
