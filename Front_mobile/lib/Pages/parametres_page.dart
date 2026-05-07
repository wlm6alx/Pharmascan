import 'package:flutter/material.dart';

class ParametresPage extends StatelessWidget {
  const ParametresPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(6, 18, 12, 18),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(
                        Icons.arrow_back_ios_new,
                        color: Color(0xFF1193AB),
                      ),
                    ),
                    const Expanded(
                      child: Text(
                        'PARAMETRES',
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
              ),
              const _SettingsSectionTitle('Parametres generaux'),
              const _SettingTile(
                title: 'Langue',
                value: 'Francais',
              ),
              const _SettingTile(
                title: 'Theme',
                value: 'Clair',
              ),
              const _SettingTile(
                title: 'Notification',
                value: 'Activer',
              ),
              const _SettingsSectionTitle('Gestion de session'),
              const _SettingTile(
                title: 'Gestion de session',
                value: '2 Jours',
              ),
              const _SettingTile(
                title: 'Chiffrement des donnees',
                value: 'Activer',
              ),
              const _SettingsSectionTitle('Autres'),
              const _SettingTile(
                title: 'Historique des sans',
                value: 'Activer',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsSectionTitle extends StatelessWidget {
  final String title;

  const _SettingsSectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFFF4F4F4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: Colors.black87,
        ),
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  final String title;
  final String value;

  const _SettingTile({
    required this.title,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$title bientot disponible')),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: Colors.grey.shade200,
            ),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.public,
              size: 20,
              color: Colors.black87,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.chevron_right,
              color: Colors.black54,
            ),
          ],
        ),
      ),
    );
  }
}
