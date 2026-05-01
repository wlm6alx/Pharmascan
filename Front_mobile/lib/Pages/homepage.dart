import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:pharmascan/modele/ItineraireModel.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/services/ItineraireService.dart';
import 'package:pharmascan/services/pharmacyService.dart';

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  LatLng? _currentPosition;
  final MapController _mapController = MapController();
  Timer? _retryTimer;
  StreamSubscription<Position>? _positionStream;
  bool _chargement = true;
  String _statutLocalisation = "Vérification de la localisation...";

  // Recherche
  final TextEditingController _searchController = TextEditingController();
  List<Pharmacie> _resultatsRecherche = [];
  bool _rechercheEnCours = false;
  Timer? _debounceTimer;

  // Itinéraire
  Itineraire? _itineraire;
  Pharmacie? _destinationChoisie;
  bool _itineraireEnCours = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getUserLocation();
    });
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    _positionStream?.cancel();
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _scheduleRetry(String message) {
    setState(() {
      _chargement = false;
      _statutLocalisation = message;
    });
    _retryTimer?.cancel();
    _retryTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      _getUserLocation();
    });
  }

  Future<void> _getUserLocation() async {
    setState(() {
      _chargement = true;
      _statutLocalisation = "Vérification de la localisation...";
    });

    bool serviceDisponible = await Geolocator.isLocationServiceEnabled();
    if (!serviceDisponible) {
      _scheduleRetry(
        "Le GPS est désactivé.\nActivez-le pour utiliser la carte.",
      );
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _scheduleRetry("Permission refusée.\nNous réessayerons dans 1 minute.");
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _scheduleRetry(
        "Permission bloquée.\nActivez la localisation dans les paramètres.",
      );
      return;
    }

    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );

      _retryTimer?.cancel();
      setState(() {
        _currentPosition = LatLng(position.latitude, position.longitude);
        _chargement = false;
      });

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController.move(_currentPosition!, 15.0);
      });

      _demarrerTracking();
    } on TimeoutException catch (_) {
      setState(() {
        _currentPosition = LatLng(3.8480, 11.5021);
        _chargement = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController.move(_currentPosition!, 12.0);
      });
      _demarrerTracking();
    } catch (e) {
      _scheduleRetry(
        "Erreur de localisation.\nNous réessayerons dans 1 minute.",
      );
    }
  }

  void _demarrerTracking() {
    _positionStream?.cancel();
    _positionStream =
        Geolocator.getPositionStream(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            distanceFilter: 10,
          ),
        ).listen(
          (Position position) {
            setState(() {
              _currentPosition = LatLng(position.latitude, position.longitude);
            });
            _mapController.move(_currentPosition!, _mapController.camera.zoom);
          },
          onError: (e) {
            _scheduleRetry(
              "Erreur de tracking.\nNous réessayerons dans 1 minute.",
            );
          },
        );
  }

  // 👇 Recentre la carte sur la position actuelle
  void _recentrer() {
    if (_currentPosition != null) {
      _mapController.move(_currentPosition!, 15.0);
    }
  }

  // 👇 Recherche avec debounce (attend 500ms après la dernière frappe)
  void _onSearch(String query) {
    _debounceTimer?.cancel();
    if (query.isEmpty) {
      setState(() => _resultatsRecherche = []);
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      setState(() => _rechercheEnCours = true);
      final resultats = await PharmacyService.rechercher(query);
      setState(() {
        _resultatsRecherche = resultats;
        _rechercheEnCours = false;
      });
    });
  }

  // 👇 Calcule l'itinéraire vers une pharmacie
  Future<void> _allerVers(Pharmacie pharmacie) async {
    if (_currentPosition == null) return;

    setState(() {
      _itineraireEnCours = true;
      _destinationChoisie = pharmacie;
      _resultatsRecherche = [];
      _searchController.clear();
    });

    final itineraire = await ItineraireService.getItineraire(
      depart: _currentPosition!,
      destination: pharmacie.position,
    );

    setState(() {
      _itineraire = itineraire;
      _itineraireEnCours = false;
    });

    // Centre la carte sur l'itinéraire
    if (itineraire != null) {
      _mapController.move(pharmacie.position, 14.0);
    }
  }

  // 👇 Annule l'itinéraire
  void _annulerItineraire() {
    setState(() {
      _itineraire = null;
      _destinationChoisie = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_currentPosition == null) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.location_off,
                size: 80,
                color: Color(0xFF1193AB),
              ),
              const SizedBox(height: 20),
              Text(
                _statutLocalisation,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Colors.grey),
              ),
              const SizedBox(height: 30),
              if (_chargement)
                const CircularProgressIndicator(color: Color(0xFF1193AB))
              else
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1193AB),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  onPressed: _getUserLocation,
                  icon: const Icon(Icons.refresh, color: Colors.white),
                  label: const Text(
                    "Réessayer maintenant",
                    style: TextStyle(color: Colors.white),
                  ),
                ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          // ── Carte ──
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _currentPosition!,
              initialZoom: 15.0,
              keepAlive: true,
              minZoom: 9,
              onTap: (_, __) {
                // Ferme les résultats si on tape sur la carte
                setState(() => _resultatsRecherche = []);
              },
              interactionOptions: InteractionOptions(
                flags:
                    ~InteractiveFlag.doubleTapZoom &
                    InteractiveFlag.flingAnimation,
                cursorKeyboardRotationOptions:
                    CursorKeyboardRotationOptions.disabled(),
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: dotenv.env['MAP_TILE_URL'] ?? '',
                maxNativeZoom: 19,
                userAgentPackageName:
                    dotenv.env['USER_AGENT'] ?? 'com.pharmascan',
              ),

              // 👇 Tracé de l'itinéraire
              if (_itineraire != null)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _itineraire!.coordonnees,
                      strokeWidth: 4,
                      color: const Color(0xFF1193AB),
                    ),
                  ],
                ),

              // 👇 Markers
              MarkerLayer(
                markers: [
                  // Position actuelle
                  Marker(
                    point: _currentPosition!,
                    width: 40,
                    height: 40,
                    child: const Icon(
                      Icons.location_pin,
                      color: Colors.red,
                      size: 40,
                    ),
                  ),

                  // Markers des pharmacies trouvées
                  ..._resultatsRecherche.map(
                    (pharmacie) => Marker(
                      point: pharmacie.position,
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () => _allerVers(pharmacie),
                        child: const Icon(
                          Icons.local_pharmacy,
                          color: Color(0xFF1193AB),
                          size: 40,
                        ),
                      ),
                    ),
                  ),

                  // Marker destination choisie
                  if (_destinationChoisie != null)
                    Marker(
                      point: _destinationChoisie!.position,
                      width: 40,
                      height: 40,
                      child: const Icon(
                        Icons.local_pharmacy,
                        color: Colors.green,
                        size: 40,
                      ),
                    ),
                ],
              ),
            ],
          ),

          // ── Barre de recherche ──
          Positioned(
            top: 50,
            left: 16,
            right: 16,
            child: Column(
              children: [
                Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: _onSearch,
                    decoration: InputDecoration(
                      hintText: "Rechercher une pharmacie...",
                      hintStyle: const TextStyle(color: Colors.grey),
                      prefixIcon: const Icon(
                        Icons.search,
                        color: Color(0xFF1193AB),
                      ),
                      suffixIcon: _rechercheEnCours
                          ? const Padding(
                              padding: EdgeInsets.all(12),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Color(0xFF1193AB),
                              ),
                            )
                          : _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _resultatsRecherche = []);
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),

                // 👇 Liste des résultats
                if (_resultatsRecherche.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    child: ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _resultatsRecherche.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, indent: 16),
                      itemBuilder: (context, index) {
                        final pharmacie = _resultatsRecherche[index];
                        return ListTile(
                          leading: Icon(
                            Icons.local_pharmacy,
                            color: pharmacie.source
                                ? const Color(0xFF1193AB)
                                : Colors.orange,
                          ),
                          title: Text(
                            pharmacie.nom,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            pharmacie.adresse,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: const Icon(
                            Icons.directions,
                            color: Color(0xFF1193AB),
                          ),
                          onTap: () => _allerVers(pharmacie),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // ── Bouton recentrer ──
          Positioned(
            bottom: 110,
            right: 16,
            child: FloatingActionButton.small(
              onPressed: _recentrer,
              backgroundColor: Colors.white,
              elevation: 4,
              child: const Icon(Icons.my_location, color: Color(0xFF1193AB)),
            ),
          ),

          // ── Panneau itinéraire ──
          if (_itineraireEnCours)
            Positioned(
              bottom: 110,
              left: 16,
              right: 60,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(
                      color: Color(0xFF1193AB),
                      strokeWidth: 2,
                    ),
                    SizedBox(width: 12),
                    Text("Calcul de l'itinéraire..."),
                  ],
                ),
              ),
            ),

          if (_itineraire != null && !_itineraireEnCours)
            Positioned(
              bottom: 110,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_pharmacy, color: Color(0xFF1193AB)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _destinationChoisie?.nom ?? '',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Row(
                            children: [
                              const Icon(
                                Icons.directions_car,
                                size: 14,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _itineraire!.dureeFormatee,
                                style: const TextStyle(color: Colors.grey),
                              ),
                              const SizedBox(width: 12),
                              const Icon(
                                Icons.straighten,
                                size: 14,
                                color: Colors.grey,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _itineraire!.distanceFormatee,
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _annulerItineraire,
                      icon: const Icon(Icons.close, color: Colors.red),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
