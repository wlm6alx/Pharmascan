class Itineraire {
  final List<LatLng> coordonnees; // points de l'itinéraire
  final double distanceMetres;
  final double dureesSecondes;

  Itineraire({
    required this.coordonnees,
    required this.distanceMetres,
    required this.dureesSecondes,
  });

  // Convertit les secondes en texte lisible
  String get dureeFormatee {
    final minutes = (dureesSecondes / 60).round();
    if (minutes < 60) return "$minutes min";
    final heures = minutes ~/ 60;
    final reste = minutes % 60;
    return "${heures}h ${reste}min";
  }

  // Convertit les mètres en texte lisible
  String get distanceFormatee {
    if (distanceMetres < 1000) {
      return "${distanceMetres.round()} m";
    }
    return "${(distanceMetres / 1000).toStringAsFixed(1)} km";
  }
}