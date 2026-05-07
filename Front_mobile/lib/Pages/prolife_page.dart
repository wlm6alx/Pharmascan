import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/InscriptionConnexion.dart';
import 'package:pharmascan/Pages/modifier_profil.dart';
import 'package:pharmascan/Pages/parametres_page.dart';
import 'package:pharmascan/modele/modeleUser.dart';
import 'package:pharmascan/services/InscriptionService.dart';
import 'package:pharmascan/services/serviceD_authentification.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfileState();
}

class _ProfileState extends State<ProfilePage> {
  late Future<Users?> _userFuture;

  @override
  void initState() {
    super.initState();
    _userFuture = _chargerUtilisateurActuel();
  }

  Future<Users?> _chargerUtilisateurActuel() async {
    final Users? userConnecte =
        await serviceD_authentification.getUtilisateurConnecte();
    if (userConnecte != null) {
      return userConnecte;
    }

    final List<Users> users = await UserService.chargerUsers();
    return users.isNotEmpty ? users.first : null;
  }

  Future<void> _ouvrirModifierProfil(Users? user) async {
    final bool? profilModifie = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ModifierProfilPage(user: user),
      ),
    );

    if (profilModifie == true && mounted) {
      setState(() {
        _userFuture = _chargerUtilisateurActuel();
      });
    }
  }

  void _ouvrirParametres() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const ParametresPage(),
      ),
    );
  }

  Future<void> _deconnecter() async {
    await serviceD_authentification.logout();
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Deconnexion reussie.')),
    );

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => const Inscriptionconnexion(),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: FutureBuilder<Users?>(
          future: _userFuture,
          builder: (context, snapshot) {
            final Users? user = snapshot.data;
            final String displayName = user?.nomUtilisateur ?? 'Utilisateur';
            final String displayEmail =
                user?.email ?? 'utilisateur@pharmascan.com';

            return SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(8, 20, 8, 140),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ProfileHeader(
                    displayName: displayName,
                    displayEmail: displayEmail,
                  ),
                  const SizedBox(height: 36),
                  _ProfileActionTile(
                    icon: Icons.edit_outlined,
                    title: 'Modifier profil',
                    onTap: () => _ouvrirModifierProfil(user),
                  ),
                  _ProfileActionTile(
                    icon: Icons.settings_outlined,
                    title: 'Parametres',
                    onTap: _ouvrirParametres,
                  ),
                  _ProfileActionTile(
                    icon: Icons.logout,
                    title: 'Deconnexion',
                    onTap: _deconnecter,
                    isLast: true,
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String displayName;
  final String displayEmail;

  const _ProfileHeader({
    required this.displayName,
    required this.displayEmail,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 34),
      decoration: BoxDecoration(
        color: const Color(0xFFDDF7F2),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
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
          const SizedBox(height: 16),
          Text(
            displayName,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.black87,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            displayEmail,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: Colors.black54,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool isLast;

  const _ProfileActionTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 18),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: Colors.grey.shade300,
            ),
          ),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 42,
              child: Icon(
                icon,
                size: 28,
                color: Colors.black87,
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w400,
                  color: Colors.black87,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: Colors.black87,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}
