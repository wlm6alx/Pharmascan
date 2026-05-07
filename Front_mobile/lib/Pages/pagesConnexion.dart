import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/mot_de_passe_oublie_page.dart';
import 'package:pharmascan/navigation/Navigation.dart';
import 'package:pharmascan/services/serviceD_authentification.dart';

class PagesConnexion extends StatefulWidget {
  const PagesConnexion({super.key});

  @override
  State<PagesConnexion> createState() => _PagesConnexionState();
}

class _PagesConnexionState extends State<PagesConnexion> {
  bool mdpCache = true;
  final TextEditingController nomUtilisateurController =
      TextEditingController();
  final TextEditingController motDePasseController = TextEditingController();

  @override
  void dispose() {
    nomUtilisateurController.dispose();
    motDePasseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = const Color(0xFF1193AB);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1193AB)),
        ),
        title: Text(
          'CONNEXION',
          style: TextStyle(
            color: primaryColor,
            fontWeight: FontWeight.w400,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 30),
            Center(
              child: Image.asset("asset/images/Logo.png", height: 120),
            ),
            const SizedBox(height: 30),
            TextFormField(
              controller: nomUtilisateurController,
              decoration: InputDecoration(
                hintText: "Nom d'utilisateur",
                hintStyle: const TextStyle(color: Colors.black26),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF1193AB)),
                ),
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: motDePasseController,
              obscureText: mdpCache,
              decoration: InputDecoration(
                hintText: "Mot de passe",
                hintStyle: const TextStyle(color: Colors.black26),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 15,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    mdpCache
                        ? Icons.visibility_off_outlined
                        : Icons.visibility,
                    color: Colors.black26,
                  ),
                  onPressed: () {
                    setState(() {
                      mdpCache = !mdpCache;
                    });
                  },
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.black12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF1193AB)),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1193AB),
                minimumSize: const Size(double.infinity, 50),
              ),
              onPressed: () async {
                final nomUtilisateur = nomUtilisateurController.text.trim();
                final motdepasse = motDePasseController.text.trim();

                final estCorrect = await serviceD_authentification.login(
                  nomUtilisateur,
                  motdepasse,
                );

                if (estCorrect) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Connexion reussie !")),
                  );
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const MainNavigation(),
                    ),
                    (route) => false,
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Username ou mot de passe incorrect!!"),
                    ),
                  );
                }
              },
              child: const Text(
                "Se connecter",
                style: TextStyle(color: Colors.white),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MotDePasseOubliePage(),
                  ),
                );
              },
              child: const Text(
                "Mot de passe oublie ?",
                style: TextStyle(color: Color(0xFF7BC1B7)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
