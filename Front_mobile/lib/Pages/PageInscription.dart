import 'package:flutter/material.dart';
//import 'package:pharmascan/Pages/InscriptionConnexion.dart';
import 'package:pharmascan/Pages/pagesConnexion.dart';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/userService.dart'; // 👈 plus uuid ni InscriptionService

class PageInscription extends StatefulWidget {
  const PageInscription({super.key});

  @override
  State<PageInscription> createState() => _InscriptionPageState();
}

class _InscriptionPageState extends State<PageInscription> {
  bool _motDePasseCache = true;
  bool _termsAccepter = false;
  bool _chargement = false;

  final _NomUtilisateurController = TextEditingController();
  final _emailController = TextEditingController();
  final _motDePasseController = TextEditingController();
  final _NameController = TextEditingController();
  final _surenameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _NomUtilisateurController.dispose();
    _emailController.dispose();
    _motDePasseController.dispose();
    _NameController.dispose();
    _surenameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _inscrire() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_termsAccepter) {
      _afficherMessage(
        "Veuillez accepter les termes et la politique de confidentialité.",
        estErreur: true,
      );
      return;
    }

    setState(() => _chargement = true);

    // 👇 ID vide — Supabase génère l'UUID automatiquement
    final nouveauUser = Users(
      id: '',
      name: _NameController.text.trim(),
      surname: _surenameController.text.trim(),
      phone: _phoneController.text.trim(),
      role: 'patient',
      userstate: true,
      username: _NomUtilisateurController.text.trim(),
      email: _emailController.text.trim(),
      password: _motDePasseController.text,
    );

    // 👇 inscrireUser retourne maintenant un Map
    final resultat = await UserService.inscrireUser(nouveauUser);

    setState(() => _chargement = false);

    if (resultat['succes'] == true) {
      _afficherMessage(
        resultat['source'] == 'supabase'
            ? "Inscription réussie ! Vérifiez votre email."
            : "Inscription réussie !",
      );
      Future.delayed(const Duration(seconds: 2), () {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const PagesConnexion()),
          (route) => false,
        );
      });
    } else {
      _afficherMessage(
        resultat['message'] ?? "Cet email est déjà utilisé.",
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
          key: _formKey,
          child: Column(
            children: [
              const SizedBox(height: 20),

              _buildTextField(
                controller: _NameController,
                hintText: "Nom",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "Le nom est requis";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

              _buildTextField(
                controller: _surenameController,
                hintText: "Prenom",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "Le prénom est requis";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

              _buildTextField(
                controller: _NomUtilisateurController,
                hintText: "Username",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "Le nom est requis";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),
              _buildTextField(
                controller: _phoneController,
                hintText: "Numéro Ex : +237 6...",
                validateur: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return "Le nom est requis";
                  }
                  if (!RegExp(r'^\+[0-9]+$').hasMatch(val.trim())) {
                    return "Format invalide. Ex: +237612345678";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 15),

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
                  if (val.length < 8) {
                    return "Minimum 8 caractères";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

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
                          TextSpan(
                            text: "Je confirme avoir lu et accepté les ",
                          ),
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
                  isPassword ? Icons.visibility_off_outlined : Icons.visibility,
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
