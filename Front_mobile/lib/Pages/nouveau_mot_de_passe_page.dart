import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/pagesConnexion.dart';

class NouveauMotDePassePage extends StatefulWidget {
  final String email;

  const NouveauMotDePassePage({
    super.key,
    required this.email,
  });

  @override
  State<NouveauMotDePassePage> createState() =>
      _NouveauMotDePassePageState();
}

class _NouveauMotDePassePageState extends State<NouveauMotDePassePage> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _motDePasseController = TextEditingController();
  final TextEditingController _confirmationController = TextEditingController();
  bool _motDePasseCache = true;
  bool _confirmationCache = true;

  @override
  void dispose() {
    _motDePasseController.dispose();
    _confirmationController.dispose();
    super.dispose();
  }

  Future<void> _reinitialiserMotDePasse() async {
    if (!_formKey.currentState!.validate()) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Page prete pour la reinitialisation via Supabase.',
        ),
      ),
    );

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const PagesConnexion(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leadingWidth: 100,
        leading: TextButton.icon(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1193AB)),
          label: const Text(
            'Retour',
            style: TextStyle(color: Color(0xFF1193AB)),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Creer un nouveau mot de passe',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Votre nouveau mot de passe doit etre different de votre precedent mot de passe.',
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.black87,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 18),
              TextFormField(
                controller: _motDePasseController,
                obscureText: _motDePasseCache,
                validator: (value) {
                  final String motDePasse = (value ?? '').trim();
                  if (motDePasse.length < 8) {
                    return 'Au moins 8 caracteres au minimum';
                  }
                  return null;
                },
                decoration: InputDecoration(
                  hintText: 'Mot de passe',
                  suffixIcon: IconButton(
                    onPressed: () {
                      setState(() {
                        _motDePasseCache = !_motDePasseCache;
                      });
                    },
                    icon: Icon(
                      _motDePasseCache
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: Colors.black26,
                    ),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
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
              const SizedBox(height: 8),
              const Text(
                'Au moins 8 caracteres au minimum',
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _confirmationController,
                obscureText: _confirmationCache,
                validator: (value) {
                  if ((value ?? '').trim() != _motDePasseController.text.trim()) {
                    return 'Les 2 mots de passe doivent etre identiques';
                  }
                  return null;
                },
                decoration: InputDecoration(
                  hintText: 'Confirmer mot de passe',
                  suffixIcon: IconButton(
                    onPressed: () {
                      setState(() {
                        _confirmationCache = !_confirmationCache;
                      });
                    },
                    icon: Icon(
                      _confirmationCache
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: Colors.black26,
                    ),
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
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
              const SizedBox(height: 8),
              const Text(
                'Les 2 mots de passe doivent etre identiques',
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 28),
              Center(
                child: SizedBox(
                  width: 210,
                  child: ElevatedButton(
                    onPressed: _reinitialiserMotDePasse,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1193AB),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: const Text(
                      'Reinitialiser le mot de passe',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
