class Users {
  final String id;
  final String? name;
  final String? surname;
  final String? username;
  final String phone;
  final String email;
  final String password;
  final String? role;
  final bool? userstate;
  final String? token; // 👈 ajoute cette ligne

  Users({
    this.token,
    this.role,
    this.userstate,
    required this.id,
    required this.name,
    required this.surname,
    required this.phone,
    required this.username,
    required this.email,
    required this.password,
  });

  factory Users.fromJson(Map<String, dynamic> json) {
    return Users(
      id: json['id'] is int ? json['id'].toString() : json['id'],
      username: json['username'],
      userstate: json['userstate'],
      role: json['role'],
      email: json['email'],
      phone: json['phone'],
      name: json['name'],
      surname: json['surname'],
      password: json['password'] ?? '',
      token: json['token'], // 👈 ajoute
    );
  }

  Users copyWith({
    String? id,
    String? username,
    String? role,
    String? phone,
    String? name,
    String? email,
    bool? userstate,
    String? surname,
    String? password,
    String? token, // 👈 ajoute
  }) {
    return Users(
      id: id ?? this.id,
      username: username ?? this.username,
      role: role ?? this.role,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      surname: surname ?? this.surname,
      userstate: userstate ?? this.userstate,
      email: email ?? this.email,
      password: password ?? this.password,
      token: token ?? this.token, // 👈 ajoute
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'password': password,
      'phone': phone,
      'surname': surname,
      'name': name,
      'role': role,
      'UserState': userstate,
    };
  }
}
