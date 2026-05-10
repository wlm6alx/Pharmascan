import "package:flutter/material.dart";

class BarreDeRecherche extends StatelessWidget {
  final TextEditingController controller;

  final ValueChanged<String> onChanged;

  final VoidCallback? onBack;

  const BarreDeRecherche({
    super.key,
    required this.controller,
    required this.onChanged,
    this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 45,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(25),
            ),
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              decoration: const InputDecoration(
                hintText: "Rechercher un medicament",
                border: InputBorder.none,
                icon: Icon(Icons.search),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
