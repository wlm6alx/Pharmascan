import 'package:flutter/material.dart';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/InscriptionService.dart';
import 'package:pharmascan/Pages/InscriptionConnexion.dart';
import 'package:uuid/uuid.dart'; // Package pour uuid unique

class PageInscription extends StatefulWidget {
  const PageInscription({super.key});

  @override
  State<PageInscription> createState() => _InscriptionPageState();
}

class _InscriptionPageState extends State<PageInscription> {
  //Boolléen de vérification de terme et de mot de passe
  bool _motDePasseCache = true;
  bool _termsAccepter = false;
  bool _chargement = false;

  // Controllers pour récupérer les valeurs des champs
  final _nomController = TextEditingController();
  final _emailController = TextEditingController();
  final _motDePasseController = TextEditingController();

  // Clé pour valider le formulaire et pouvoir avoir accès à celui-ci n'importe où dans le code
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _nomController.dispose();
    _emailController.dispose();
    _motDePasseController.dispose();
    super.dispose();
  }

  Future<void> _inscrire() async {
    // Validons avant tout le formulaire
    if (!_formKey.currentState!.validate()) return;

    // Vérification des termes et leur validité
    if (!_termsAccepter) {
      _afficherMessage(
        "Veuillez accepter les termes et la politique de confidentialité.",
        estErreur: true,
      );
      return;
    }

    setState(() => _chargement = true);

    // 3. Crée le nouvel utilisateur
    final nouveauUser = Users(
      id: const Uuid().v4(), // génère un ID unique
      nomUtilisateur: _nomController.text.trim(),
      email: _emailController.text.trim(),
      password: _motDePasseController.text,
    );

    // 4. Tente l'inscription
    final succes = await UserService.inscrireUser(nouveauUser);

    setState(() => _chargement = false);

    if (succes) {
      _afficherMessage("Inscription réussie !");
      // Redirige vers la page de connexion après succès
      Future.delayed(const Duration(seconds: 1), () {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (_) => const Inscriptionconnexion(),
          ),
              (route) => false,
        );
      });
    } else {
      _afficherMessage(
        "Cet email est déjà utilisé.",
        estErreur: true,
      );
    }
  }

  void _afficherMessage(String message, {bool estErreur = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: estErreur ? Colors.red : const Color(0xFF7BC1B7),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF7BC1B7)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'INSCRIPTION',
          style: TextStyle(
            color: Color(0xFF7BC1B7),
            fontWeight: FontWeight.w400,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Form(
          key: _formKey, // 👈 enveloppe dans un Form pour la validation
          child: Column(
            children: [
              const SizedBox(height: 20),

              // ── Nom d'utilisateur ──
              _buildTextField(
                controller: _nomController,
                hintText: "Nom d'utilisateur",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "Le nom est requis";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

              // ── Adresse mail ──
              _buildTextField(
                controller: _emailController,
                hintText: "Adresse mail",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "L'email est requis";
                  }
                  if (!val.contains('@') || !val.contains('.')) {
                    return "Email invalide";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

              // ── Mot de passe ──
              _buildTextField(
                controller: _motDePasseController,
                hintText: "Mot de passe",
                isPassword: _motDePasseCache,
                onTogglePassword: () {
                  setState(() => _motDePasseCache = !_motDePasseCache);
                },
                validateur: (val) {
                  if (val == null || val.isEmpty) {
                    return "Le mot de passe est requis";
                  }
                  if (val.length < 6) {
                    return "Minimum 6 caractères";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // ── Checkbox terms ──
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 24,
                    width: 24,
                    child: Checkbox(
                      value: _termsAccepter,
                      activeColor: const Color(0xFF7BC1B7),
                      onChanged: (bool? value) {
                        setState(() => _termsAccepter = value!);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: RichText(
                      text: const TextSpan(
                        style: TextStyle(
                          color: Colors.grey,
                          fontSize: 13,
                          height: 1.4,
                        ),
                        children: [
                          TextSpan(text: "Je confirme avoir lu et accepté les "),
                          TextSpan(
                            text: "termes du contrat ",
                            style: TextStyle(
                              color: Colors.blue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextSpan(text: "et "),
                          TextSpan(
                            text: "la politique de confidentialité ",
                            style: TextStyle(
                              color: Colors.blue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextSpan(text: "et avoir plus de 18 ans"),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30),

              // ── Bouton S'inscrire ──
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _chargement ? null : _inscrire,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7BC1B7),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: _chargement
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                    "S'inscrire",
                    style: TextStyle(color: Colors.white, fontSize: 16),
                  ),
                ),
              ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hintText,
    bool isPassword = false,
    VoidCallback? onTogglePassword,
    String? Function(String?)? validateur,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword,
      validator: validateur,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.black26),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 15,
          vertical: 15,
        ),
        suffixIcon: onTogglePassword != null
            ? IconButton(
          icon: Icon(
            isPassword
                ? Icons.visibility_off_outlined
                : Icons.visibility,
            color: Colors.black26,
          ),
          onPressed: onTogglePassword,
        )
            : null,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Colors.black12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF7BC1B7)),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Colors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Colors.red),
        ),
      ),
    );
  }
}