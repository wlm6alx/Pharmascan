import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pharmascan/Pages/ScanScreen.dart';
import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:pharmascan/services/MedocService.dart';
import 'package:pharmascan/widgets/BarreDeRecherche.dart';

class PageDeScan extends StatefulWidget {
  const PageDeScan({super.key});

  @override
  State<PageDeScan> createState() => _PageDeScanState();
}

class _PageDeScanState extends State<PageDeScan>
    with SingleTickerProviderStateMixin {
  List<Medoc> _historique = [];
  List<Medoc> _resultats = [];
  bool _chargement = true;
  bool _scanEnCours = false;
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
        _resultats = _historique;
        _chargement = false;
      });
    } catch (e) {
      setState(() {
        _erreur = "Impossible de charger les medicaments.";
        _chargement = false;
      });
    }
  }

  void _rechercher(String valeur) {
    setState(() {
      _resultats = _filtrerHistorique(valeur);
    });
  }

  void _ouvrirScanner() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) => SizedBox(
        height: MediaQuery.of(modalContext).size.height * 0.85,
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: ScanScreen(
            onDetect: (barcodeCapture) {
              _traiterScan(barcodeCapture);
              Navigator.of(modalContext).pop();
            },
          ),
        ),
      ),
    );
  }

  Future<void> _traiterScan(BarcodeCapture barcodeCapture) async {
    final Barcode? premierBarcode = barcodeCapture.barcodes.isNotEmpty
        ? barcodeCapture.barcodes.first
        : null;
    final String? code = premierBarcode?.rawValue;

    if (!mounted) return;

    if (code == null || code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Aucun code exploitable n\'a ete detecte.'),
        ),
      );
      return;
    }

    setState(() => _scanEnCours = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Verification du medicament...')),
    );

    try {
      final verification = await Medocservice.verifierCodeBarre(code);
      final medocScanne = Medoc.fromVerification(verification);

      if (!mounted) return;

      setState(() {
        _historique = [medocScanne, ..._historique].take(6).toList();
        _resultats = _filtrerHistorique(_searchController.text);
        _scanEnCours = false;
      });

      _afficherResultatScan(verification);
    } catch (e) {
      if (!mounted) return;

      setState(() => _scanEnCours = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible de verifier ce medicament maintenant.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  List<Medoc> _filtrerHistorique(String valeur) {
    if (valeur.isEmpty) return _historique;

    return _historique.where((medoc) {
      final recherche = valeur.toLowerCase();
      final nomMatch = medoc.nom.toLowerCase().contains(recherche);
      final dosageMatch = medoc.dosage.toLowerCase().contains(recherche);
      final codeMatch = medoc.code_barre?.toLowerCase().contains(recherche) ??
          false;
      return nomMatch || dosageMatch || codeMatch;
    }).toList();
  }

  void _afficherResultatScan(VerificationMedicament verification) {
    final Color couleur = verification.correct
        ? const Color(0xFF1193AB)
        : Colors.red;
    final IconData icon = verification.correct
        ? Icons.verified
        : Icons.warning_amber_rounded;

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        icon: Icon(icon, color: couleur, size: 44),
        title: Text(
          verification.description,
          textAlign: TextAlign.center,
          style: TextStyle(color: couleur, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Code-barres : ${verification.code_barre}'),
            if (verification.nom != null) ...[
              const SizedBox(height: 8),
              Text('Nom : ${verification.nom}'),
            ],
            if (verification.dosage != null &&
                verification.dosage!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('Dosage : ${verification.dosage}'),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
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
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                const Text(
                  "Scan de medicaments",
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
                  onChanged: _rechercher,
                ),
                const SizedBox(height: 16),
                const Text(
                  "Medicaments scannes recemment",
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
        padding: const EdgeInsets.only(bottom: 100),
        child: FloatingActionButton(
          onPressed: _scanEnCours ? null : _ouvrirScanner,
          tooltip: _scanEnCours ? 'Verification en cours' : 'Scanner',
          backgroundColor: const Color(0xFF1193AB),
          elevation: 6,
          shape: const CircleBorder(),
          child: _scanEnCours
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.4,
                  ),
                )
              : const Icon(Icons.add, color: Colors.white, size: 30),
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
                "Reessayer",
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );
    }

    if (_resultats.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.search_off, size: 60, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _searchController.text.isEmpty
                  ? "Aucun scan recent"
                  : 'Aucun resultat pour "${_searchController.text}"',
              style: const TextStyle(color: Colors.grey, fontSize: 15),
              textAlign: TextAlign.center,
            ),
            if (_searchController.text.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text(
                  "Appuyez sur + pour scanner un medicament",
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      );
    }

    return GridView.builder(
      physics: const BouncingScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.78,
      ),
      itemCount: _resultats.length,
      itemBuilder: (context, index) {
        return _CarteMedicament(medoc: _resultats[index]);
      },
    );
  }
}

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
                "Non trouve",
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
