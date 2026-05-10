class Medoc {
  final String nom;
  final String dosage;
  final String dateHeure;
  final bool trouve;
  final String imageAsset;
  final String? code_barre;
  final String? description;

  Medoc({
    required this.nom,
    required this.dosage,
    required this.dateHeure,
    required this.trouve,
    required this.imageAsset,
    this.code_barre,
    this.description,
  });

  factory Medoc.fromJson(Map<String, dynamic> json) {
    return Medoc(
      nom: (json['nom'] ?? 'Medicament inconnu').toString(),
      dosage: (json['dosage'] ?? '').toString(),
      dateHeure: (json['dateHeure'] ?? '').toString(),
      trouve: json['trouve'] == true,
      imageAsset: (json['imageAsset'] ?? 'asset/images/medicament.png')
          .toString(),
      code_barre: (json['codeBarre'] ?? json['code_barre'] ?? json['barcode'])
          ?.toString(),
      description: json['description']?.toString(),
    );
  }

  factory Medoc.fromVerification(VerificationMedicament verification) {
    return Medoc(
      nom: verification.nom ?? 'Medicament suspect',
      dosage: verification.dosage ?? verification.code_barre,
      dateHeure: _dateHeureActuelle(),
      trouve: verification.correct,
      imageAsset: 'asset/images/medicament.png',
      code_barre: verification.code_barre,
      description: verification.description,
    );
  }

  static String _dateHeureActuelle() {
    final now = DateTime.now();
    final heure = now.hour.toString().padLeft(2, '0');
    final minute = now.minute.toString().padLeft(2, '0');
    return 'AUJ. $heure:$minute';
  }
}

class VerificationMedicament {
  final bool correct;
  final String code_barre;
  final String? nom;
  final String? dosage;
  final String description;

  const VerificationMedicament({
    required this.correct,
    required this.code_barre,
    this.nom,
    this.dosage,
    required this.description,
  });

  factory VerificationMedicament.correct({
    required String code_barre,
    required Map<String, dynamic> json,
  }) {
    return VerificationMedicament(
      correct: true,
      code_barre: code_barre,
      nom: (json['nom'] ?? json['name'] ?? json['medicament_nom'])
          ?.toString(),
      dosage: (json['dosage'] ?? json['dose'])?.toString(),
      description: 'Medicament correct',
    );
  }

  factory VerificationMedicament.suspect(String code_barre) {
    return VerificationMedicament(
      correct: false,
      code_barre: code_barre,
      description: 'Medicament suspect',
    );
  }
}
