import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/SplashScreen.dart';
import 'package:device_preview/device_preview.dart';

void main() {
  runApp(const MyApp()); // 👈 MyApp est l'ARGUMENT de runApp, pas une flèche
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      locale: DevicePreview.locale(context),
      home: const SplashScreen(), // 👈 ajoute const ici aussi
    );
  }
}