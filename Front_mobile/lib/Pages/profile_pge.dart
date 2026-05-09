import 'package:flutter/material.dart';

class ProfilePge extends StatelessWidget {
  const ProfilePge({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FAF8),
      body: SafeArea(
        child: Column(
          children: [
            // ── Header avec avatar et nom ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 40),
              decoration: const BoxDecoration(
                color: Color(0xFFDFF4F0),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(30),
                  bottomRight: Radius.circular(30),
                ),
              ),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 90,
                    height: 90,
                    decoration: const BoxDecoration(
                      color: Color(0xFF1193AB),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person_outline,
                      size: 50,
                      color: Colors.white,
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Nom
                  const Text(
                    "Trysha Rockbell",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // ── Liste des options ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  _ItemProfil(
                    icone: Icons.edit_off_outlined,
                    label: "Modifier profil",
                    onTap: () {
                      // TODO: naviguer vers la page de modification
                    },
                  ),
                  const Divider(height: 1, color: Color(0xFFE0E0E0)),

                  _ItemProfil(
                    icone: Icons.settings_outlined,
                    label: "Paramètres",
                    onTap: () {
                      // TODO: naviguer vers les paramètres
                    },
                  ),
                  const Divider(height: 1, color: Color(0xFFE0E0E0)),

                  _ItemProfil(
                    icone: Icons.logout_outlined,
                    label: "Déconnexion",
                    couleurLabel: Colors.black87,
                    onTap: () {
                      // TODO: logique de déconnexion
                      _confirmerDeconnexion(context);
                    },
                  ),
                ],
              ),
            ),

            // Espace pour la navbar flottante
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  // Dialog de confirmation de déconnexion
  void _confirmerDeconnexion(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text("Déconnexion"),
        content: const Text("Voulez-vous vraiment vous déconnecter ?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Annuler", style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1193AB),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            onPressed: () {
              Navigator.pop(context);
              // TODO: implémenter la déconnexion réelle
            },
            child: const Text(
              "Confirmer",
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Widget item du menu profil ──
class _ItemProfil extends StatelessWidget {
  final IconData icone;
  final String label;
  final VoidCallback onTap;
  final Color couleurLabel;

  const _ItemProfil({
    required this.icone,
    required this.label,
    required this.onTap,
    this.couleurLabel = Colors.black87,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Row(
          children: [
            // Icône
            Icon(icone, size: 22, color: Colors.black54),

            const SizedBox(width: 20),

            // Label
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 15,
                  color: couleurLabel,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ),

            // Chevron
            const Icon(Icons.chevron_right, color: Colors.black38, size: 20),
          ],
        ),
      ),
    );
  }
}
