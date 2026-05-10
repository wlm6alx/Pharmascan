import 'dart:async';

import 'package:flutter/material.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/services/medicineSearchService.dart';
import 'package:pharmascan/widgets/BarreDeRecherche.dart';
import 'package:pharmascan/widgets/PharmacyCard.dart';

class SearchPage extends StatefulWidget {
  final ValueChanged<Pharmacie>? onPharmacySelected;

  const SearchPage({super.key, this.onPharmacySelected});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<Pharmacie> _pharmacies = [];
  bool _isLoading = false;
  bool _hasSearched = false;
  String? _errorMessage;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    final recherche = query.trim();

    if (recherche.isEmpty) {
      setState(() {
        _pharmacies = [];
        _isLoading = false;
        _hasSearched = false;
        _errorMessage = null;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 450), () {
      _searchMedicine(recherche);
    });
  }

  Future<void> _searchMedicine(String query) async {
    setState(() {
      _isLoading = true;
      _hasSearched = true;
      _errorMessage = null;
    });

    try {
      final resultats =
          await MedicineSearchService.rechercherPharmaciesParMedicament(query);

      if (!mounted) return;

      setState(() {
        _pharmacies = resultats;
        _isLoading = false;
      });
    } on MedicineSearchException catch (e) {
      if (!mounted) return;

      setState(() {
        _pharmacies = [];
        _isLoading = false;
        _errorMessage = e.message;
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        _pharmacies = [];
        _isLoading = false;
        _errorMessage =
            "Impossible de rechercher ce medicament pour le moment.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              BarreDeRecherche(
                controller: _searchController,
                onChanged: _onSearchChanged,
              ),
              const SizedBox(height: 24),
              Expanded(child: _buildSearchContent()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchContent() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Text(
          _errorMessage!,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.red),
        ),
      );
    }

    if (!_hasSearched) {
      return const Center(
        child: Text(
          "Entrez le nom d'un medicament pour voir les pharmacies disponibles.",
          textAlign: TextAlign.center,
        ),
      );
    }

    if (_pharmacies.isEmpty) {
      return const Center(
        child: Text(
          "Aucune pharmacie ne possede ce medicament.",
          textAlign: TextAlign.center,
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 2;
        if (constraints.maxWidth > 600) crossAxisCount = 3;
        if (constraints.maxWidth > 900) crossAxisCount = 4;

        return GridView.builder(
          itemCount: _pharmacies.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.9,
          ),
          itemBuilder: (context, index) {
            return PharmacyCard(
              pharmacy: _pharmacies[index],
              onTap: () {
                widget.onPharmacySelected?.call(_pharmacies[index]);
              },
            );
          },
        );
      },
    );
  }
}
