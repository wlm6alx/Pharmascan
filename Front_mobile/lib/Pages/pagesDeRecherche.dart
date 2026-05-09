import 'package:flutter/material.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/services/pharmacyService.dart';
import 'package:pharmascan/widgets/BarreDeRecherche.dart';
import 'package:pharmascan/widgets/PharmacyCard.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _searchController = TextEditingController();
  List<Pharmacie> _allPharmacies = [];
  List<Pharmacie> _filteredPharmacies = [];

  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    // On utilise rechercher("") qui charge les données locales sans avoir besoin de position GPS
    final data = await PharmacyService.rechercher("");
    if (mounted) {
      setState(() {
        _allPharmacies = data;
        _filteredPharmacies = data;
        _isLoading = false;
      });
    }
  }

  void _onSearchChanged(String query) {
    setState(() {
      _filteredPharmacies = _allPharmacies.where((pharmacy) {
        final q = query.toLowerCase();
        return pharmacy.name.toLowerCase().contains(q) ||
            pharmacy.adress.toLowerCase().contains(q);
      }).toList();
    });
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

              Expanded(
                child: _isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF1193AB),
                        ),
                      )
                    : _filteredPharmacies.isEmpty
                    ? const Center(child: Text("Aucun résultat"))
                    : LayoutBuilder(
                        builder: (context, constraints) {
                          int crossAxisCount = 2;
                          if (constraints.maxWidth > 600) crossAxisCount = 3;
                          if (constraints.maxWidth > 900) crossAxisCount = 4;

                          return GridView.builder(
                            itemCount: _filteredPharmacies.length,
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  mainAxisSpacing: 16,
                                  crossAxisSpacing: 16,
                                  childAspectRatio: 0.9,
                                ),
                            itemBuilder: (context, index) {
                              return PharmacyCard(
                                pharmacy: _filteredPharmacies[index],
                                onTap: () {
                                  // navigation vers détail
                                },
                              );
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
