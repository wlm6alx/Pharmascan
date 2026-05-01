import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:pharmascan/modele/modeleItineraire.dart';

class ItineraireService {

  static Future<Itineraire?> getItineraire({
    required LatLng depart,
    required LatLng destination,
  }) async {
    try {
      // 👇 Format OSRM : longitude,latitude
      final url = Uri.parse(
          'https://router.project-osrm.org/route/v1/driving/'
              '${depart.longitude},${depart.latitude};'
              '${destination.longitude},${destination.latitude}'
              '?overview=full&geometries=geojson'
      );

      final response = await http.get(url, headers: {
        'User-Agent': 'PharmaScan/1.0 (com.pharmascan)',
      });

      if (response.statusCode != 200) return null;

      final data = json.decode(response.body);
      if (data['routes'] == null || data['routes'].isEmpty) return null;

      final route = data['routes'][0];
      final List coords = route['geometry']['coordinates'];

      return Itineraire(
        coordonnees: coords
            .map((c) => LatLng(c[1].toDouble(), c[0].toDouble()))
            .toList(),
        distanceMetres: route['distance'].toDouble(),
        dureeSecondes: route['duration'].toDouble(),
      );

    } catch (e) {
      print("❌ Erreur OSRM : $e");
      return null;
    }
  }
}