class Medoc{
   final  String nom;
  final String dosage;
  final String dateHeure;
  final bool trouve;
  final String imageAsset;

  Medoc ({
    required this.nom,
    required this.dosage,
    required this.dateHeure,
    required this.trouve,
    required this.imageAsset
});

  factory Medoc.fromJson(Map<String, dynamic> json) {
    return Medoc(
      nom: json['nom'],
      dosage: json['dosage'],
      dateHeure: json['dateHeure'],
      trouve: json['trouve'],
      imageAsset: json['imageAsset'],
    );}
}