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
  bool _mdpCache = true;
  bool _chargement = false;
  final TextEditingController _nomUtilisateurController =
      TextEditingController();
  final TextEditingController _motDePasseController = TextEditingController();

  @override
  void dispose() {
    _nomUtilisateurController.dispose();
    _motDePasseController.dispose();
    super.dispose();
  }

  Future<void> _connecter() async {
    final email = _nomUtilisateurController.text.trim();
    final motDePasse = _motDePasseController.text.trim();

    // 👇 Validation basique
    if (email.isEmpty || motDePasse.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Veuillez remplir tous les champs."),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _chargement = true);

    final estCorrect = await ServiceDAuthentification.login(email, motDePasse);

    setState(() => _chargement = false);

    if (estCorrect) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Connexion réussie !"),
          backgroundColor: Color(0xFF1193AB),
        ),
      );
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const MainNavigation()),
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Nom d'utilisateur ou mot de passe incorrect."),
          backgroundColor: Colors.red,
        ),
      );
    }
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
            Center(child: Image.asset("asset/images/Logo.png", height: 120)),
            const SizedBox(height: 30),

            // email
            TextFormField(
              controller: _nomUtilisateurController,
              decoration: InputDecoration(
                hintText: "email",
                hintStyle: const TextStyle(color: Colors.black26),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.black12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: primaryColor),
                ),
              ),
            ),
            const SizedBox(height: 10),

            // ── Mot de passe ──
            TextFormField(
              controller: _motDePasseController,
              obscureText: _mdpCache,
              decoration: InputDecoration(
                hintText: "Mot de passe",
                hintStyle: const TextStyle(color: Colors.black26),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 15,
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _mdpCache
                        ? Icons.visibility_off_outlined
                        : Icons.visibility,
                    color: Colors.black26,
                  ),
                  onPressed: () {
                    setState(() => _mdpCache = !_mdpCache);
                  },
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.black12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: primaryColor),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── Bouton Se connecter ──
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                onPressed: _chargement ? null : _connecter,
                child: _chargement
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text(
                        "Se connecter",
                        style: TextStyle(color: Colors.white, fontSize: 16),
                      ),
              ),
            ),
            const SizedBox(height: 10),

            // ── Mot de passe oublié ──
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
                "Mot de passe oublié ?",
                style: TextStyle(color: Color(0xFF7BC1B7)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
