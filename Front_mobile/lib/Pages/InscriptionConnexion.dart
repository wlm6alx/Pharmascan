import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/pagesConnexion.dart';
import 'package:pharmascan/Pages/PageInscription.dart';
class Inscriptionconnexion extends StatefulWidget
{
  const Inscriptionconnexion ({super.key});

  @override
  State<Inscriptionconnexion> createState()=> _InscriptionconnexionState();

}

class _InscriptionconnexionState extends State<Inscriptionconnexion>
{
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center( // centre tout l'écran
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center, // CENTRAGE VERTICAL
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Image.asset(
                "asset/images/Logo.png",
                height: 120,
              ),

              const SizedBox(height: 40),

              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1193AB),
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PagesConnexion(),
                    ),
                  );
                },
                child: const Text("Se connecter", style: TextStyle(color: Colors.white),),
              ),

              const SizedBox(height: 20),

              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7BC1B7),
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PageInscription(),
                    ),
                  );
                },
                child: const Text("S'inscrire", style: TextStyle(color: Colors.white),),
              ),
            ],
          ),
        ),
      ),
    );
  }
}


