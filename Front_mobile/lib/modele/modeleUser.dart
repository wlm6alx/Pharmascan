class Users {
  final int id;
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
      id: json['id'],
      nomUtilisateur: json['nomUtilisateur'],
      email: json['email'],
      password: json['password'],
    );
  }
}
