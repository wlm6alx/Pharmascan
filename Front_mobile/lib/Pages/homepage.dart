import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  LatLng? _currentPosition;
  final MapController _mapController = MapController();
  Timer? _retryTimer;
  StreamSubscription<Position>? _positionStream; // 👈 stream de position
  bool _chargement = true;
  String _statutLocalisation = "Vérification de la localisation en cours...";

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
    _positionStream?.cancel(); // 👈 stoppe le stream proprement
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

    // 1. GPS activé ?
    bool serviceDisponible = await Geolocator.isLocationServiceEnabled();
    if (!serviceDisponible) {
      _scheduleRetry("Le GPS est désactivé.\nActivez-le pour utiliser la carte.");
      return;
    }

    // 2. Permissions
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _scheduleRetry("Permission refusée.\nNous réessayerons dans 1 minute.");
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _scheduleRetry("Permission bloquée.\nActivez la localisation dans les paramètres.");
      return;
    }

    // 3. Position initiale précise (sans cache)
    try {
      Position position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
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

      // 4. Lance le stream de tracking en temps réel
      _demarrerTracking();

    } catch (e) {
      _scheduleRetry("Erreur de localisation.\nNous réessayerons dans 1 minute.");
    }
  }

  void _demarrerTracking() {
    _positionStream?.cancel(); // évite les doublons

    _positionStream = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10, // 👈 se déclenche seulement si l'user bouge de 10m
      ),
    ).listen(
          (Position position) {
        // 👇 mise à jour du marqueur à chaque nouveau mouvement
        setState(() {
          _currentPosition = LatLng(position.latitude, position.longitude);
        });
        _mapController.move(_currentPosition!, _mapController.camera.zoom);
      },
      onError: (e) {
        _scheduleRetry("Erreur de tracking.\nNous réessayerons dans 1 minute.");
      },
    );
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
              const Icon(Icons.location_off, size: 80, color: Color(0xFF1193AB)),
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
                      horizontal: 24, vertical: 12,
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

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _currentPosition!,
        initialZoom: 15.0,
        keepAlive: true,
        minZoom: 9,
        interactionOptions: InteractionOptions(
          flags: ~InteractiveFlag.doubleTapZoom &
          InteractiveFlag.flingAnimation,
          cursorKeyboardRotationOptions: CursorKeyboardRotationOptions.disabled(),
        ),
      ),
      children: [
        TileLayer(
          urlTemplate: dotenv.env['MAP_TILE_URL'] ?? '',
          maxNativeZoom: 19,
          userAgentPackageName: dotenv.env['USER_AGENT'] ?? 'com.pharmascan',
        ),
        MarkerLayer(
          markers: [
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
          ],
        ),
      ],
    );
  }
}