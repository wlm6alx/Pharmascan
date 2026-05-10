import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:pharmascan/Pages/ScanScreen.dart';
import 'package:pharmascan/modele/modeleMedocs.dart';
import 'package:pharmascan/services/serviceMedicament.dart';
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
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
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
        _historique = medocs;
        _resultats = medocs;
        _chargement = false;
      });
    } catch (e) {
      setState(() {
        _erreur = "Impossible de charger les médicaments.";
        _chargement = false;
      });
    }
  }

  void _rechercher(String valeur) {
    setState(() {
      _resultats = _filtrerHistorique(valeur);
    });
  }

  List<Medoc> _filtrerHistorique(String valeur) {
    if (valeur.isEmpty) return _historique;
    final recherche = valeur.toLowerCase();
    return _historique.where((medoc) {
      final nomMatch = medoc.nom.toLowerCase().contains(recherche);
      final dosageMatch =
          medoc.dosage?.toLowerCase().contains(recherche) ?? false;
      final codeMatch =
          (medoc.codeBarre ?? medoc.code_barre)?.toLowerCase().contains(
            recherche,
          ) ??
          false;
      return nomMatch || dosageMatch || codeMatch;
    }).toList();
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
    final String? code = barcodeCapture.barcodes.isNotEmpty
        ? barcodeCapture.barcodes.first.rawValue
        : null;

    if (!mounted) return;

    if (code == null || code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Aucun code exploitable détecté.")),
      );
      return;
    }

    setState(() => _scanEnCours = true);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Vérification du médicament...")),
    );

    try {
      // 👇 Vérifie dans Supabase et sauvegarde automatiquement
      final verification = await Medocservice.verifierCodeBarre(code);

      if (!mounted) return;

      // 👇 Recharge l'historique depuis le stockage local
      await _chargerHistorique();

      setState(() => _scanEnCours = false);

      _afficherResultatScan(verification);
    } catch (e) {
      if (!mounted) return;
      setState(() => _scanEnCours = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Impossible de vérifier ce médicament."),
          backgroundColor: Colors.red,
        ),
      );
    }
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
            _ligneInfo("Code barre", verification.code_barre),
            if (verification.nom != null) _ligneInfo("Nom", verification.nom!),
            if (verification.dosage != null)
              _ligneInfo("Dosage", verification.dosage!),
            if (verification.fabricant != null)
              _ligneInfo("Fabricant", verification.fabricant!),
            if (verification.forme != null)
              _ligneInfo("Forme", verification.forme!),
            if (verification.dateExpiration != null)
              _ligneInfo(
                "Expiration",
                '${verification.dateExpiration!.day.toString().padLeft(2, '0')}/'
                    '${verification.dateExpiration!.month.toString().padLeft(2, '0')}/'
                    '${verification.dateExpiration!.year}',
                couleur: verification.dateExpiration!.isBefore(DateTime.now())
                    ? Colors.red
                    : null,
              ),
            if (verification.prix != null && verification.prix! > 0)
              _ligneInfo(
                "Prix",
                "${verification.prix!.toStringAsFixed(0)} FCFA",
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }

  Widget _ligneInfo(String label, String valeur, {Color? couleur}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              "$label :",
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
          Expanded(
            child: Text(
              valeur,
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: couleur ?? Colors.black87,
                fontSize: 12,
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
        child: FadeTransition(
          opacity: _fadeAnim,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                const Text(
                  "Scan de médicaments",
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Médicaments scannés récemment",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                        color: Color(0xFF1193AB),
                      ),
                    ),
                    // 👇 Compteur de scans
                    Text(
                      "${_historique.length}/6",
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(child: _buildContenu()),
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
          tooltip: _scanEnCours ? "Vérification en cours" : "Scanner",
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
                "Réessayer",
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
            const Icon(Icons.qr_code_scanner, size: 60, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _searchController.text.isEmpty
                  ? "Aucun scan récent"
                  : 'Aucun résultat pour "${_searchController.text}"',
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
        return _CarteMedicament(
          medoc: _resultats[index],
          onTap: () => _afficherDetailMedoc(_resultats[index]),
        );
      },
    );
  }

  // 👇 BottomSheet détails d'un scan de l'historique
  void _afficherDetailMedoc(Medoc medoc) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
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

            // Nom + statut
            Row(
              children: [
                const Icon(Icons.medication, color: Color(0xFF1193AB)),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    medoc.nom,
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
                    color: medoc.trouve
                        ? Colors.green.withOpacity(0.1)
                        : Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    medoc.trouve ? "Authentifié" : "Suspect",
                    style: TextStyle(
                      color: medoc.trouve ? Colors.green : Colors.red,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),

            _ligneInfo(
              "Code barre",
              medoc.codeBarre ?? medoc.code_barre ?? 'Non spécifié',
            ),
            if (medoc.dosage != null) _ligneInfo("Dosage", medoc.dosage!),
            if (medoc.forme != null) _ligneInfo("Forme", medoc.forme!),
            if (medoc.fabricant != null)
              _ligneInfo("Fabricant", medoc.fabricant!),
            _ligneInfo(
              "Date d'expiration",
              medoc.dateExpirationFormatee,
              couleur: medoc.estExpire ? Colors.red : null,
            ),
            if (medoc.prix > 0)
              _ligneInfo("Prix", "${medoc.prix.toStringAsFixed(0)} FCFA"),

            const SizedBox(height: 8),
            _ligneInfo("Scanné le", medoc.dateHeure),
          ],
        ),
      ),
    );
  }
}

// ── Carte médicament ──
class _CarteMedicament extends StatelessWidget {
  final Medoc medoc;
  final VoidCallback? onTap;

  const _CarteMedicament({required this.medoc, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            if (medoc.dosage != null)
              Text(
                medoc.dosage!,
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
      ),
    );
  }
}
