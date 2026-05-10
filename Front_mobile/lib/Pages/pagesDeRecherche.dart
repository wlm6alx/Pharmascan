import 'dart:async';

import 'package:flutter/material.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
//import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:pharmascan/services/serviceMedicament.dart';
import 'package:pharmascan/widgets/BarreDeRecherche.dart';

class SearchPage extends StatefulWidget {
  final ValueChanged<Pharmacie>? onPharmacySelected;

  const SearchPage({super.key, this.onPharmacySelected});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final TextEditingController _searchController = TextEditingController();
  Timer? _debounce;
  List<MedicamentAvecPharmacie> _resultats = [];
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
        _resultats = [];
        _isLoading = false;
        _hasSearched = false;
        _errorMessage = null;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 450), () {
      _rechercher(recherche);
    });
  }

  Future<void> _rechercher(String query) async {
    setState(() {
      _isLoading = true;
      _hasSearched = true;
      _errorMessage = null;
    });

    try {
      final resultats = await Medocservice.rechercherMedicaments(query);

      if (!mounted) return;
      setState(() {
        _resultats = resultats;
        _isLoading = false;
      });
    } on MedicineSearchException catch (e) {
      if (!mounted) return;
      setState(() {
        _resultats = [];
        _isLoading = false;
        _errorMessage = e.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _resultats = [];
        _isLoading = false;
        _errorMessage = "Impossible de rechercher ce médicament.";
      });
    }
  }

  // 👇 BottomSheet détails médicament
  void _afficherDetails(MedicamentAvecPharmacie item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        builder: (_, scrollController) => Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollController,
            children: [
              // ── Handle ──
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // ── Nom + disponibilité ──
              Row(
                children: [
                  const Icon(Icons.medication, color: Color(0xFF1193AB)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      item.medoc.nom,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: item.medoc.disponible
                          ? Colors.green.withOpacity(0.1)
                          : Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      item.medoc.disponible ? "Disponible" : "Indisponible",
                      style: TextStyle(
                        color: item.medoc.disponible
                            ? Colors.green
                            : Colors.red,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 12),

              // ── Informations médicament ──
              _infoLigne("Code barre", item.medoc.codeBarre ?? 'Non spécifié'),
              _infoLigne("Dosage", item.medoc.dosage ?? 'Non spécifié'),
              _infoLigne("Forme", item.medoc.forme ?? 'Non spécifiée'),
              _infoLigne("Fabricant", item.medoc.fabricant ?? 'Non spécifié'),
              _infoLigne(
                "Date de production",
                item.medoc.dateProductionFormatee,
              ),
              _infoLigne(
                "Date d'expiration",
                item.medoc.dateExpirationFormatee,
                couleur: item.medoc.estExpire ? Colors.red : null,
              ),
              _infoLigne("Prix", "${item.medoc.prix.toStringAsFixed(0)} FCFA"),
              _infoLigne("Quantité disponible", "${item.medoc.quantite}"),

              if (item.medoc.description != null) ...[
                const SizedBox(height: 8),
                Text(
                  "Description",
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.medoc.description!,
                  style: const TextStyle(color: Colors.grey),
                ),
              ],

              // ── Pharmacie associée ──
              if (item.pharmacie != null) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 12),
                const Text(
                  "Pharmacie",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 8),
                _infoLigne("Nom", item.pharmacie!.name),
                _infoLigne("Adresse", item.pharmacie!.adress),
                if (item.pharmacie!.ville != null)
                  _infoLigne("Ville", item.pharmacie!.ville!),
                if (item.pharmacie!.quartier != null)
                  _infoLigne("Quartier", item.pharmacie!.quartier!),
                if (item.pharmacie!.phone_number != null)
                  _infoLigne(
                    "Téléphone",
                    '${item.pharmacie!.indicphone ?? ''} ${item.pharmacie!.phone_number ?? ''}'
                        .trim(),
                  ),
              ],

              const SizedBox(height: 24),

              // ── Bouton itinéraire ──
              if (item.pharmacie != null)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1193AB),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      // 👇 Navigue vers la map avec l'itinéraire
                      widget.onPharmacySelected?.call(item.pharmacie!);
                    },
                    icon: const Icon(Icons.directions, color: Colors.white),
                    label: const Text(
                      "Itinéraire vers la pharmacie",
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.info_outline, color: Colors.orange),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          "Aucune pharmacie associée à ce médicament.",
                          style: TextStyle(color: Colors.orange),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoLigne(String label, String valeur, {Color? couleur}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 160,
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
          Expanded(
            child: Text(
              valeur,
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: couleur ?? Colors.black87,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
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
              Expanded(child: _buildContenu()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContenu() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1193AB)),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 60, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    if (!_hasSearched) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 60, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              "Entrez le nom d'un médicament\npour trouver les pharmacies disponibles.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    if (_resultats.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.medication_outlined, size: 60, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              "Aucune pharmacie ne possède ce médicament.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    // 👇 Liste des résultats
    return ListView.separated(
      itemCount: _resultats.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = _resultats[index];
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 8,
          ),
          leading: Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFF1193AB).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.medication, color: Color(0xFF1193AB)),
          ),
          title: Text(
            item.medoc.nom,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (item.medoc.dosage != null)
                Text(item.medoc.dosage!, style: const TextStyle(fontSize: 12)),
              if (item.pharmacie != null)
                Text(
                  item.pharmacie!.name,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1193AB),
                  ),
                ),
            ],
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                "${item.medoc.prix.toStringAsFixed(0)} FCFA",
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1193AB),
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 4),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: item.medoc.disponible
                      ? Colors.green.withOpacity(0.1)
                      : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  item.medoc.disponible ? "Dispo" : "Indispo",
                  style: TextStyle(
                    fontSize: 10,
                    color: item.medoc.disponible ? Colors.green : Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          onTap: () => _afficherDetails(item),
        );
      },
    );
  }
}
