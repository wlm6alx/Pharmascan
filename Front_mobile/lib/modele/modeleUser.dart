class Users {
  final String id;
  final String nomUtilisateur;
  final String email;
  final String password;

  Users({
    required this.id,
    required this.nomUtilisateur,
    required this.email,
    required this.password,
  });

  factory Users.fromJson(Map<String, dynamic> json) {
    return Users(
      id: json['id'] is int ? json['id'].toString() : json['id'],
      nomUtilisateur: json['nomUtilisateur'],
      email: json['email'],
      password: json['password'],
    );
  }

  Users copyWith({
    String? id,
    String? nomUtilisateur,
    String? email,
    String? password,
  }) {
    return Users(
      id: id ?? this.id,
      nomUtilisateur: nomUtilisateur ?? this.nomUtilisateur,
      email: email ?? this.email,
      password: password ?? this.password,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nomUtilisateur': nomUtilisateur,
      'email': email,
      'password': password,
    };
  }
}
