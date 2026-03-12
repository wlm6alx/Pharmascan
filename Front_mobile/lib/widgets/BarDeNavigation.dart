import 'package:flutter/material.dart';

class CustomBottomNav extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const CustomBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      height: 65,
      decoration: BoxDecoration(
        color: const Color(0xFF1193AB),
        borderRadius: BorderRadius.circular(40),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(_items.length, (index) {
          final isActive = index == currentIndex;
          return GestureDetector(
            onTap: () => onTap(index),
            behavior: HitTestBehavior.opaque,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isActive ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(30),
              ),
              child: Row(
                children: [
                  Icon(
                    _items[index].icon,
                    color: isActive
                        ? const Color(0xFF1193AB)
                        : Colors.white,
                  ),
                  if (isActive) ...[
                    const SizedBox(width: 8),
                    Text(
                      _items[index].label,
                      style: const TextStyle(
                        color: Color(0xFF1193AB),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ]
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  _NavItem(this.icon, this.label);
}

final _items = [
  _NavItem(Icons.home, "Accueil"),
  _NavItem(Icons.search, "Search"),
  _NavItem(Icons.qr_code_scanner, "Scan"),
  _NavItem(Icons.person, "Profil"),
]; //voici le code de CustomNavBar