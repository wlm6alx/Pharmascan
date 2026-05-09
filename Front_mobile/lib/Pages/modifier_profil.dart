import 'package:flutter/material.dart';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/InscriptionService.dart';

class ModifierProfilPage extends StatefulWidget {
  final Users? user;

  const ModifierProfilPage({super.key, this.user});

  @override
  State<ModifierProfilPage> createState() => _ModifierProfilPageState();
}

class _ModifierProfilPageState extends State<ModifierProfilPage> {
  late final TextEditingController _usernameController;
  late final TextEditingController _emailController;
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  bool _enregistrementEnCours = false;

  @override
  void initState() {
    super.initState();
    _usernameController = TextEditingController(
      text: widget.user?.username ?? '',
    );
    _emailController = TextEditingController(text: widget.user?.email ?? '');
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _enregistrer() async {
    if (!_formKey.currentState!.validate()) return;

    if (widget.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Aucun utilisateur a modifier.')),
      );
      return;
    }

    setState(() {
      _enregistrementEnCours = true;
    });

    final Users userModifie = widget.user!.copyWith(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
    );

    final bool succes = await UserService.modifierUser(userModifie);

    if (!mounted) return;

    setState(() {
      _enregistrementEnCours = false;
    });

    if (!succes) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de modifier ce profil.')),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Profil modifie avec succes.')),
    );
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final String displayName = widget.user?.username ?? 'Utilisateur';

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(8, 20, 8, 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDDF7F2),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(
                              Icons.arrow_back_ios_new,
                              color: Color(0xFF1193AB),
                              size: 20,
                            ),
                          ),
                          const Expanded(
                            child: Text(
                              'MODIFIER PROFIL',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Color(0xFF1193AB),
                                fontSize: 22,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                      const SizedBox(height: 18),
                      Container(
                        width: 138,
                        height: 138,
                        decoration: const BoxDecoration(
                          color: Color(0xFF1193AB),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.account_circle_outlined,
                          size: 88,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        displayName,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w500,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _ProfileInputField(
                  controller: _usernameController,
                  hintText: "Nom d'utilisateur",
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Veuillez entrer un nom utilisateur';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                _ProfileInputField(
                  controller: _emailController,
                  hintText: 'Adresse mail',
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    final String email = (value ?? '').trim();
                    if (email.isEmpty) {
                      return 'Veuillez entrer une adresse mail';
                    }
                    if (!email.contains('@') || !email.contains('.')) {
                      return 'Adresse mail invalide';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 26),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _enregistrementEnCours ? null : _enregistrer,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1193AB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                      ),
                      elevation: 0,
                    ),
                    child: _enregistrementEnCours
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Enregistrer',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProfileInputField extends StatelessWidget {
  final TextEditingController controller;
  final String hintText;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;

  const _ProfileInputField({
    required this.controller,
    required this.hintText,
    this.keyboardType = TextInputType.text,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 15),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: const OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(12)),
          borderSide: BorderSide(color: Color(0xFF1193AB), width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.red, width: 1.5),
        ),
      ),
    );
  }
}
