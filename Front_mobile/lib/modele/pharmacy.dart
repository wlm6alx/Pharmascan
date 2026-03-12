class Pharmacy {
  final int id;
  final String name;
  final String address;

  Pharmacy({required this.id, required this.name, required this.address});

  factory Pharmacy.fromJson(Map<String, dynamic> json) {
    return Pharmacy(
      id: json['id'],
      name: json['name'],
      address: json['address'],
    );
  }
}
