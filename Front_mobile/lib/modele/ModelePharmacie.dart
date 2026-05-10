import 'package:latlong2/latlong.dart';

class Pharmacie {
  final String? pharmacie_id;
  final String name;
  final String adress;
  final String? pays;
  final String? ville;
  final String? quartier;
  final bool validate;
  final bool exist;
  final String? latitude;
  final String? longitude;
  final LatLng position;
  final String? phone_number;
  final String? indicphone;
  final String status;
  final bool estOuverte;
  final String source;
  final List<String> medicaments;
  final String? medicamentTrouve;
  final int? stockDisponible;

  Pharmacie({
    this.pharmacie_id,
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
    this.medicaments = const [],
    this.medicamentTrouve,
    this.stockDisponible,
  });

  factory Pharmacie.fromJson(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;

    return Pharmacie(
      pharmacie_id: (json['pharmacie_id'] ?? json['id'])?.toString(),
      name: (json['name'] ?? json['nom'] ?? 'Pharmacie Inconnue').toString(),
      adress: (json['adress'] ?? json['adresse'] ?? 'Adresse non specifiee')
          .toString(),
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      phone_number: (json['phone_number'] ?? json['telephone'] ?? json['phone'])
          ?.toString(),
      indicphone: json['indicphone']?.toString(),
      estOuverte: json['estOuverte'] ?? true,
      status: json['status']?.toString() ?? 'close',
      source: 'local',
      ville: json['ville']?.toString(),
      quartier: json['quartier']?.toString(),
      pays: json['pays']?.toString(),
      validate: json['validate'] == true,
      exist: json['exist'] == true,
      medicaments: List<String>.from(json['medicaments'] ?? []),
    );
  }

  factory Pharmacie.fromSupabase(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;
    final status = json['status']?.toString() ?? 'close';

    return Pharmacie(
      pharmacie_id: json['pharmacie_id']?.toString(),
      name: (json['name'] ?? 'Pharmacie Inconnue').toString(),
      adress: (json['adress'] ?? 'Adresse non specifiee').toString(),
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      phone_number: (json['phone_number'] ?? json['phone'])?.toString(),
      indicphone: json['indicphone']?.toString(),
      estOuverte: status == 'open',
      status: status,
      source: 'supabase',
      ville: json['ville']?.toString(),
      quartier: json['quartier']?.toString(),
      pays: json['pays']?.toString(),
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
      pharmacie_id: json['place_id']?.toString(),
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

  factory Pharmacie.fromSupabaseStock(Map<String, dynamic> json) {
    final lat = double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0;
    final lon = double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0;
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
      latitude: lat.toString(),
      longitude: lon.toString(),
      position: LatLng(lat, lon),
      phone_number: (json['telephone'] ?? json['phone_number'] ?? json['phone'])
          ?.toString(),
      source: 'supabase',
      estOuverte: true,
      status: 'open',
      medicamentTrouve: nomMedicament?.toString(),
      stockDisponible: int.tryParse(
        (json['quantite'] ?? json['stock'] ?? json['stock_disponible'] ?? '')
            .toString(),
      ),
    );
  }
}
