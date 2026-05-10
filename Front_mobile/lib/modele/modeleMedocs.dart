class Medoc {
  final String id;
  final String nom;
  final String? categorie;
  final String? description;
  final String? imagePath;
  final bool visibility;
  final String? pharmacieId;
  final String? codeBarre;
  final int quantite;
  final DateTime? dateProduction;
  final DateTime? dateExpiration;
  final String? dosage;
  final String? forme;
  final String? fabricant;
  final double prix;
  final bool disponible;

  // 👇 Champs pour l'historique local
  final bool trouve;
  final String dateHeure;
  final String imageAsset;
  final String? code_barre; // alias pour compatibilité

  Medoc({
    this.id = '',
    required this.nom,
    this.categorie,
    this.description,
    this.imagePath,
    this.visibility = false,
    this.pharmacieId,
    this.codeBarre,
    this.quantite = 0,
    this.dateProduction,
    this.dateExpiration,
    this.dosage,
    this.forme,
    this.fabricant,
    this.prix = 0,
    this.disponible = true,
    this.trouve = true,
    this.dateHeure = '',
    this.imageAsset = 'asset/images/medicament.png',
    this.code_barre,
  });

  // 👇 Depuis Supabase
  factory Medoc.fromSupabase(Map<String, dynamic> json) {
    return Medoc(
      id: json['id']?.toString() ?? '',
      nom: json['nom']?.toString() ?? 'Médicament inconnu',
      categorie: json['categorie']?.toString(),
      description: json['description']?.toString(),
      imagePath: json['image_path']?.toString(),
      visibility: json['visibility'] == true,
      pharmacieId: json['pharmacie_id']?.toString(),
      codeBarre: json['code_barre']?.toString(),
      code_barre: json['code_barre']?.toString(),
      quantite: int.tryParse(json['quantite']?.toString() ?? '0') ?? 0,
      dateProduction: json['date_production'] != null
          ? DateTime.tryParse(json['date_production'].toString())
          : null,
      dateExpiration: json['date_expiration'] != null
          ? DateTime.tryParse(json['date_expiration'].toString())
          : null,
      dosage: json['dosage']?.toString(),
      forme: json['forme']?.toString(),
      fabricant: json['fabricant']?.toString(),
      prix: double.tryParse(json['prix']?.toString() ?? '0') ?? 0,
      disponible: json['disponible'] == true,
      trouve: true,
      dateHeure: _dateHeureActuelle(),
      imageAsset: 'asset/images/medicament.png',
    );
  }

  // 👇 Depuis JSON local (historique)
  factory Medoc.fromJson(Map<String, dynamic> json) {
    return Medoc(
      id: json['id']?.toString() ?? '',
      nom: json['nom']?.toString() ?? 'Médicament inconnu',
      dosage: json['dosage']?.toString(),
      codeBarre: json['code_barre']?.toString(),
      code_barre: json['code_barre']?.toString(),
      description: json['description']?.toString(),
      imagePath: json['imagePath']?.toString(),
      imageAsset:
          json['imageAsset']?.toString() ?? 'asset/images/medicament.png',
      trouve: json['trouve'] == true,
      dateHeure: json['dateHeure']?.toString() ?? '',
      disponible: json['disponible'] ?? true,
      fabricant: json['fabricant']?.toString(),
      forme: json['forme']?.toString(),
      prix: double.tryParse(json['prix']?.toString() ?? '0') ?? 0,
      dateExpiration: json['date_expiration'] != null
          ? DateTime.tryParse(json['date_expiration'].toString())
          : null,
      dateProduction: json['date_production'] != null
          ? DateTime.tryParse(json['date_production'].toString())
          : null,
    );
  }

  // 👇 Depuis une vérification de code barre
  factory Medoc.fromVerification(VerificationMedicament verification) {
    return Medoc(
      id: '',
      nom: verification.nom ?? 'Médicament suspect',
      dosage: verification.dosage,
      code_barre: verification.code_barre,
      codeBarre: verification.code_barre,
      description: verification.description,
      imageAsset: 'asset/images/medicament.png',
      trouve: verification.correct,
      dateHeure: _dateHeureActuelle(),
      disponible: verification.correct,
      fabricant: verification.fabricant,
      forme: verification.forme,
      dateExpiration: verification.dateExpiration,
      prix: verification.prix ?? 0,
    );
  }

  // 👇 Vers JSON local pour sauvegarde
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nom': nom,
      'dosage': dosage ?? '',
      'code_barre': codeBarre ?? code_barre ?? '',
      'description': description,
      'imageAsset': imageAsset,
      'imagePath': imagePath,
      'trouve': trouve,
      'dateHeure': dateHeure,
      'disponible': disponible,
      'fabricant': fabricant,
      'forme': forme,
      'prix': prix,
      'date_expiration': dateExpiration?.toIso8601String(),
      'date_production': dateProduction?.toIso8601String(),
    };
  }

  String get dateExpirationFormatee {
    if (dateExpiration == null) return 'Non spécifiée';
    return '${dateExpiration!.day.toString().padLeft(2, '0')}/'
        '${dateExpiration!.month.toString().padLeft(2, '0')}/'
        '${dateExpiration!.year}';
  }

  String get dateProductionFormatee {
    if (dateProduction == null) return 'Non spécifiée';
    return '${dateProduction!.day.toString().padLeft(2, '0')}/'
        '${dateProduction!.month.toString().padLeft(2, '0')}/'
        '${dateProduction!.year}';
  }

  bool get estExpire {
    if (dateExpiration == null) return false;
    return dateExpiration!.isBefore(DateTime.now());
  }

  static String _dateHeureActuelle() {
    final now = DateTime.now();
    final heure = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return 'AUJ. $heure:$minute';
  }
}

// ════════════════════════════════════════════════════════
// Résultat de vérification d'un code barre
// ════════════════════════════════════════════════════════

class VerificationMedicament {
  final bool correct;
  final String code_barre;
  final String? nom;
  final String? dosage;
  final String? fabricant;
  final String? forme;
  final DateTime? dateExpiration;
  final double? prix;
  final String description;

  const VerificationMedicament({
    required this.correct,
    required this.code_barre,
    this.nom,
    this.dosage,
    this.fabricant,
    this.forme,
    this.dateExpiration,
    this.prix,
    required this.description,
  });

  factory VerificationMedicament.correct({
    required String code_barre,
    required Map<String, dynamic> json,
  }) {
    return VerificationMedicament(
      correct: true,
      code_barre: code_barre,
      nom: json['nom']?.toString(),
      dosage: json['dosage']?.toString(),
      fabricant: json['fabricant']?.toString(),
      forme: json['forme']?.toString(),
      dateExpiration: json['date_expiration'] != null
          ? DateTime.tryParse(json['date_expiration'].toString())
          : null,
      prix: double.tryParse(json['prix']?.toString() ?? '0') ?? 0,
      description: 'Médicament authentifié ✅',
    );
  }

  factory VerificationMedicament.suspect(String code_barre) {
    return VerificationMedicament(
      correct: false,
      code_barre: code_barre,
      description: 'Médicament non reconnu ⚠️',
    );
  }
}
