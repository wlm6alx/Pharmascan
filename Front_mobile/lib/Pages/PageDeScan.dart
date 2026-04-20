import 'package:flutter/material.dart';
import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:pharmascan/services/Medocservice.dart';
import 'package:pharmascan/widgets/BarreDeRecherche.dart';

class PageDeScan extends StatefulWidget {
  const PageDeScan({super.key});

  @override
  State<PageDeScan> createState() => _PageDeScanState();
}

class _PageDeScanState extends State<PageDeScan>
    with SingleTickerProviderStateMixin {

  List<Medoc> _historique = [];
  List<Medoc> _resultats = [];        // 👈 liste filtrée par la recherche
  bool _chargement = true;
  String? _erreur;

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _animController.forward();
    _chargerHistorique();
  }

  @override
  void dispose() {
    _animController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _chargerHistorique() async {
    try {
      setState(() {
        _chargement = true;
        _erreur = null;
      });

      final List<Medoc> medocs = await Medocservice.loadMedocs();

      setState(() {
        _historique = medocs.take(6).toList();
        _resultats = _historique; // 👈 par défaut affiche l'historique complet
        _chargement = false;
      });

    } catch (e) {
      setState(() {
        _erreur = "Impossible de charger les médicaments.";
        _chargement = false;
      });
    }
  }

  // 👇 Filtre l'historique selon la saisie
  void _rechercher(String valeur) {
    setState(() {
      if (valeur.isEmpty) {
        _resultats = _historique; // si vide → affiche tout l'historique
      } else {
        _resultats = _historique.where((medoc) {
          final nomMatch = medoc.nom
              .toLowerCase()
              .contains(valeur.toLowerCase());
          final dosageMatch = medoc.dosage
              .toLowerCase()
              .contains(valeur.toLowerCase());
          return nomMatch || dosageMatch;
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                const SizedBox(height: 20),

                const Text(
                  "RECENT",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                    color: Colors.black87,
                  ),
                ),

                const SizedBox(height: 12),

                BarreDeRecherche(
                  controller: _searchController,
                  onChanged: _rechercher, // 👈 branché sur _rechercher
                  onBack: () => Navigator.pop(context),
                ),

                const SizedBox(height: 16),

                const Text(
                  "MEDICAMENTS",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                    color: Color(0xFF1193AB),
                  ),
                ),

                const SizedBox(height: 16),

                Expanded(
                  child: _buildContenu(),
                ),

                const SizedBox(height: 100),
              ],
            ),
          ),
        ),
      ),

      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 70),
        child: FloatingActionButton(
          onPressed: () {
            // TODO: ton collègue implémente le scanner ici
          },
          backgroundColor: const Color(0xFF1193AB),
          elevation: 6,
          shape: const CircleBorder(),
          child: const Icon(Icons.add, color: Colors.white, size: 30),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildContenu() {
    if (_chargement) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF1193AB)),
      );
    }

    if (_erreur != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 60, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _erreur!,
              style: const TextStyle(color: Colors.grey, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1193AB),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
              onPressed: _chargerHistorique,
              icon: const Icon(Icons.refresh, color: Colors.white),
              label: const Text(
                "Réessayer",
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }

    // 👇 Aucun résultat de recherche
    if (_resultats.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 60, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _searchController.text.isEmpty
                  ? "Aucun scan récent"
                  : "Aucun résultat pour \"${_searchController.text}\"",
              style: const TextStyle(color: Colors.grey, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            if (_searchController.text.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  "Appuyez sur + pour scanner un médicament",
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      );
    }

    // 👇 Grille avec _resultats au lieu de _historique
    return GridView.builder(
      physics: const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemCount: _resultats.length,       // 👈 _resultats et non _historique
      itemBuilder: (context, index) {
        return _CarteMedicament(medoc: _resultats[index]); // 👈 idem
      },
    );
  }
}

// ── Carte médicament ── (inchangée)
class _CarteMedicament extends StatelessWidget {
  final Medoc medoc;

  const _CarteMedicament({required this.medoc});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.07),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: medoc.trouve
              ? Colors.transparent
              : Colors.red.withOpacity(0.3),
          width: 1.5,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.asset(
                medoc.imageAsset,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.medication,
                  color: Color(0xFF1193AB),
                  size: 36,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            medoc.nom,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          Text(
            medoc.dosage,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 10, color: Colors.grey),
          ),
          const SizedBox(height: 4),
          Text(
            medoc.dateHeure,
            style: TextStyle(
              fontSize: 9,
              color: medoc.trouve ? const Color(0xFF1193AB) : Colors.red,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (!medoc.trouve)
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text(
                "Non trouvé",
                style: TextStyle(
                  fontSize: 8,
                  color: Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }
}