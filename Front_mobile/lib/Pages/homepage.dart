import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_svg/flutter_svg.dart';
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
  LatLng? _dernierePositionChargement; // 👈 pour savoir quand recharger
  final MapController _mapController = MapController();
  Timer? _retryTimer;
  StreamSubscription<Position>? _positionStream;
  bool _chargement = true;
  String _statutLocalisation = "Vérification de la localisation...";

  // Pharmacies proches
  List<Pharmacie> _pharmaciesProches = []; // 👈 pharmacies dans 3km
  bool _chargementPharmacies = false;

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
      _chargerPharmaciesProches(); // 👈 charge les pharmacies après GPS
    } on TimeoutException catch (_) {
      setState(() {
        _currentPosition = LatLng(3.8480, 11.5021);
        _chargement = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _mapController.move(_currentPosition!, 12.0);
      });
      _demarrerTracking();
      _chargerPharmaciesProches(); // 👈 charge aussi sur position par défaut
    } catch (e) {
      _scheduleRetry(
        "Erreur de localisation.\nNous réessayerons dans 1 minute.",
      );
    }
  }

  // 👇 Charge les pharmacies dans un rayon de 3km
  Future<void> _chargerPharmaciesProches() async {
    if (_currentPosition == null) return;

    setState(() {
      _chargementPharmacies = true;
      _dernierePositionChargement = _currentPosition;
    });

    final pharmacies = await PharmacyService.loadPharmacies(_currentPosition!);

    if (mounted) {
      setState(() {
        _pharmaciesProches = pharmacies;
        _chargementPharmacies = false;
      });
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
            final nouvellePosition = LatLng(
              position.latitude,
              position.longitude,
            );

            setState(() => _currentPosition = nouvellePosition);
            _mapController.move(_currentPosition!, _mapController.camera.zoom);

            // 👇 Recharge les pharmacies si l'user a bougé de plus de 500m
            if (_dernierePositionChargement != null) {
              final distance = PharmacyService.calculerDistance(
                nouvellePosition,
                _dernierePositionChargement!,
              );
              if (distance > 0.5) _chargerPharmaciesProches();
            } else {
              _chargerPharmaciesProches();
            }
          },
          onError: (e) {
            _scheduleRetry(
              "Erreur de tracking.\nNous réessayerons dans 1 minute.",
            );
          },
        );
  }

  void _recentrer() {
    if (_currentPosition != null) {
      _mapController.move(_currentPosition!, 15.0);
    }
  }

  void _onSearch(String query) {
    _debounceTimer?.cancel();
    if (query.isEmpty) {
      setState(() => _resultatsRecherche = []);
      return;
    }

    _debounceTimer = Timer(const Duration(milliseconds: 500), () async {
      setState(() => _rechercheEnCours = true);
      final resultats = await PharmacyService.rechercher(
        query,
        position: _currentPosition, // 👈 passe la position pour le tri
      );
      setState(() {
        _resultatsRecherche = resultats;
        _rechercheEnCours = false;
      });
    });
  }

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

    if (itineraire != null) {
      _mapController.move(pharmacie.position, 14.0);
    }
  }

  void _annulerItineraire() {
    setState(() {
      _itineraire = null;
      _destinationChoisie = null;
    });
  }

  // 👇 BottomSheet détails pharmacie
  void _afficherDetailPharmacie(Pharmacie pharmacie) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    pharmacie.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: pharmacie.estOuverte
                        ? Colors.green.withOpacity(0.1)
                        : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    pharmacie.estOuverte ? "Ouverte" : "Fermée",
                    style: TextStyle(
                      color: pharmacie.estOuverte ? Colors.green : Colors.red,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Adresse
            Row(
              children: [
                SvgPicture.asset('asset/pharmacie1.svg', width: 24, height: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    pharmacie.adress,
                    style: const TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            ),

            // Ville / Quartier
            if (pharmacie.ville != null || pharmacie.quartier != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.map, color: Colors.grey, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    [
                      pharmacie.quartier,
                      pharmacie.ville,
                    ].whereType<String>().join(', '),
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ],

            // Téléphone
            if (pharmacie.phone_number != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.phone, color: Colors.grey, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    // 👇 Affiche indicatif + numéro si disponibles
                    '${pharmacie.indicphone ?? ''} ${pharmacie.phone_number ?? ''}'
                        .trim(),
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ],

            // Distance
            if (_currentPosition != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(
                    Icons.directions_walk,
                    color: Colors.grey,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "${PharmacyService.calculerDistanceAffichage(_currentPosition!, pharmacie.position)} de vous",
                    style: const TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            ],

            // Source
            const SizedBox(height: 6),
            Row(
              children: [
                SvgPicture.asset(
                  'asset/pharmacie1.svg',
                  width: 24,
                  height: 24,
                  color: pharmacie.source == 'supabase'
                      ? const Color(0xFF1193AB)
                      : pharmacie.source == 'osm'
                      ? Colors.orange
                      : Colors.grey,
                ),
                const SizedBox(width: 8),
                Text(
                  pharmacie.source == 'supabase'
                      ? "Partenaire PharmaScan"
                      : pharmacie.source == 'osm'
                      ? "OpenStreetMap"
                      : "Base locale",
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1193AB),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  _allerVers(pharmacie);
                },
                icon: const Icon(Icons.directions, color: Colors.white),
                label: const Text(
                  "Obtenir l'itinéraire",
                  style: TextStyle(color: Colors.white, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final largeur = MediaQuery.of(context).size.width;
    final bool isSmallPhone = largeur < 360;
    final bool isBigPhone = largeur >= 480 && largeur < 600;
    final bool isTablet = largeur >= 600;
    final double horizontalPadding = isTablet
        ? largeur * 0.2
        : (isBigPhone ? largeur * 0.1 : 16.0);

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

              // 👇 Tracé itinéraire
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

              MarkerLayer(
                markers: [
                  // 👇 Position actuelle
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

                  // 👇 Pharmacies dans 3km (toujours visibles)
                  ..._pharmaciesProches.map(
                    (pharmacie) => Marker(
                      point: pharmacie.position,
                      width: 45,
                      height: 45,
                      child: GestureDetector(
                        onTap: () => _afficherDetailPharmacie(pharmacie),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: pharmacie.source == 'supabase'
                                ? const Color(0xFF1193AB) // bleu = partenaire
                                : pharmacie.source == 'osm'
                                ? Colors
                                      .orange // orange = OSM
                                : Colors.grey, // gris = local
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.2),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: SvgPicture.asset(
                            'asset/pharmacie1.svg',
                            width: 24,
                            height: 24,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // 👇 Résultats de recherche (en plus des proches)
                  ..._resultatsRecherche
                      .where(
                        (p) => !_pharmaciesProches.any(
                          (proche) => proche.pharmacie_id == p.pharmacie_id,
                        ),
                      )
                      .map(
                        (pharmacie) => Marker(
                          point: pharmacie.position,
                          width: 40,
                          height: 40,
                          child: GestureDetector(
                            onTap: () => _afficherDetailPharmacie(pharmacie),
                            child: SvgPicture.asset(
                              'asset/pharmacie1.svg',
                              width: 24,
                              height: 24,
                            ),
                          ),
                        ),
                      ),

                  // 👇 Destination choisie
                  if (_destinationChoisie != null)
                    Marker(
                      point: _destinationChoisie!.position,
                      width: 40,
                      height: 40,
                      child: SvgPicture.asset(
                        'asset/pharmacie1.svg',
                        width: 24,
                        height: 24,
                      ),
                    ),
                ],
              ),
            ],
          ),

          // ── Indicateur chargement pharmacies ──
          if (_chargementPharmacies)
            Positioned(
              top: isTablet ? 120 : 110,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF1193AB),
                        ),
                      ),
                      SizedBox(width: 8),
                      Text(
                        "Recherche des pharmacies proches...",
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // ── Barre de recherche ──
          Positioned(
            top: isTablet ? 60 : 50,
            left: horizontalPadding,
            right: horizontalPadding,
            child: Column(
              children: [
                Container(
                  height: isSmallPhone ? 45 : 50,
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

                // 👇 Liste des résultats de recherche
                if (_resultatsRecherche.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    constraints: const BoxConstraints(maxHeight: 250),
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
                      itemCount: _resultatsRecherche.length,
                      separatorBuilder: (_, __) =>
                          const Divider(height: 1, indent: 16),
                      itemBuilder: (context, index) {
                        final pharmacie = _resultatsRecherche[index];
                        return ListTile(
                          leading: SvgPicture.asset(
                            'asset/pharmacie1.svg',
                            width: 24,
                            height: 24,
                            color: pharmacie.source == 'supabase'
                                ? const Color(0xFF1193AB)
                                : pharmacie.source == 'osm'
                                ? Colors.orange
                                : Colors.grey,
                          ),
                          title: Text(
                            pharmacie.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            pharmacie.adress,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: _currentPosition != null
                              ? Text(
                                  PharmacyService.calculerDistanceAffichage(
                                    _currentPosition!,
                                    pharmacie.position,
                                  ),
                                  style: const TextStyle(
                                    color: Color(0xFF1193AB),
                                    fontSize: 12,
                                  ),
                                )
                              : null,
                          onTap: () => _afficherDetailPharmacie(pharmacie),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // ── Bouton recentrer ──
          Positioned(
            bottom: isTablet ? 120 : 110,
            right: isTablet ? horizontalPadding : 16,
            child: FloatingActionButton.small(
              onPressed: _recentrer,
              backgroundColor: Colors.white,
              elevation: 4,
              child: const Icon(Icons.my_location, color: Color(0xFF1193AB)),
            ),
          ),

          // ── Panneau chargement itinéraire ──
          if (_itineraireEnCours)
            Positioned(
              bottom: isTablet ? 120 : 110,
              left: horizontalPadding,
              right: isTablet ? horizontalPadding : 60,
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

          // ── Panneau itinéraire actif ──
          if (_itineraire != null && !_itineraireEnCours)
            Positioned(
              bottom: isTablet ? 120 : 110,
              left: horizontalPadding,
              right: horizontalPadding,
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
                    SvgPicture.asset(
                      'asset/pharmacie1.svg',
                      width: 24,
                      height: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _destinationChoisie?.name ?? '',
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
