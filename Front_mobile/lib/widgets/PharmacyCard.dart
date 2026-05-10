import 'package:flutter/material.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';

class PharmacyCard extends StatelessWidget {
  final Pharmacie pharmacy;
  final VoidCallback onTap;

  const PharmacyCard({super.key, required this.pharmacy, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFF7BC1B7)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.local_pharmacy, size: 24),
            const SizedBox(height: 3),
            Text(
              pharmacy.name,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            ),
            const SizedBox(height: 2),
            Text(
              pharmacy.adress,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 10),
            ),
            if (pharmacy.medicamentTrouve != null) ...[
              const SizedBox(height: 6),
              Text(
                pharmacy.medicamentTrouve!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF1193AB),
                  fontWeight: FontWeight.w600,
                  fontSize: 10,
                ),
              ),
            ],
            if (pharmacy.stockDisponible != null) ...[
              const SizedBox(height: 2),
              Text(
                "Stock: ${pharmacy.stockDisponible}",
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
