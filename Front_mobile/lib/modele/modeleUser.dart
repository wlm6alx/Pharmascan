class Users {
  final String id;
  final String? name;
  final String? surename;
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
    required this.surename,
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
      name: json['Name'],
      surename: json['surename'],
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
    String? surename,
    String? password,
    String? token, // 👈 ajoute
  }) {
    return Users(
      id: id ?? this.id,
      username: username ?? this.username,
      role: role ?? this.role,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      surename: surename ?? this.surename,
      userstate: userstate ?? this.userstate,
      email: email ?? this.email,
      password: password ?? this.password,
      token: token ?? this.token, // 👈 ajoute
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'ussername': username,
      'email': email,
      'password': password,
      'phone': phone,
      'surename': surename,
      'Name': name,
      'role': role,
      'UserState': userstate,
    };
  }
}
