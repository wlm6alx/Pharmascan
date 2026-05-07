import 'package:latlong2/latlong.dart';

class Itineraire {
  final List<LatLng> coordonnees;
  final double distanceMetres;
  final double dureeSecondes;

  Itineraire({
    required this.coordonnees,
    required this.distanceMetres,
    required this.dureeSecondes,
  });

  String get dureeFormatee {
    final minutes = (dureeSecondes / 60).round();
    if (minutes < 60) return "$minutes min";
    final heures = minutes ~/ 60;
    final reste = minutes % 60;
    return "${heures}h ${reste}min";
  }

  String get distanceFormatee {
    if (distanceMetres < 1000) return "${distanceMetres.round()} m";
    return "${(distanceMetres / 1000).toStringAsFixed(1)} km";
  }
}