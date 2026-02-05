import 'package:flutter/material.dart';

class PagesConnexion extends StatefulWidget
{
  const PagesConnexion ({super.key});

  @override
  State<PagesConnexion> createState()=> _PagesConnexionState();

}

class _PagesConnexionState extends State<PagesConnexion>
{
  bool MdpCache =true;
Widget build (BuildContext context) {
final primaryColor = const Color(0xFF1193AB);
  return Scaffold(
    backgroundColor: Colors.white,
    appBar: AppBar(
      elevation: 0,
      backgroundColor: Colors.white,
      leading:
      IconButton(
        onPressed:
          ()=>Navigator.pop(context),
        icon: const Icon(Icons.arrow_back,color: Color(0xFF1193AB),),
      ),
      title: Text('CONNEXION', style: TextStyle(
        color: primaryColor,
            fontWeight: FontWeight.w400,
        fontSize: 18,
      ),
      ),
      centerTitle: true,
    ),
      body: SingleChildScrollView(
padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          crossAxisAlignment:CrossAxisAlignment.center, //permet de centrer horizontalement
          children: [
            const SizedBox(height: 30,),

            //Section logo
            Center( //permet de centrer le logo
              child: Image.asset("asset/images/Logo.png", height: 120,),
            ),
            const SizedBox(height: 30),

            // Champ Nom d’utilisateur
            _buildTextField(hintText: "Nom d'utilisateur"),
            const SizedBox(height: 15),

            // Champ Mot de passe
            TextFormField(
              obscureText: MdpCache, // utilise ton booléen
              decoration: InputDecoration(
                hintText: "Mot de passe",
                hintStyle: const TextStyle(color: Colors.black26),
                contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
                suffixIcon: IconButton(
                  icon: Icon(
                    MdpCache ? Icons.visibility_off_outlined : Icons.visibility,
                    color: Colors.black26,
                  ),
                  onPressed: () {
                    setState(() {
                      MdpCache = !MdpCache; // inverse la valeur
                    });
                  },
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.black12),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF1193AB)),
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF1193AB),
                minimumSize: const Size(double.infinity, 50),
              ),
              onPressed: () {
                // logique de connexion
              },
              child: const Text("Se connecter", style: TextStyle(color: Colors.white),),
            ),

            const SizedBox(height: 10),
            // Lien mot de passe oublié
            TextButton(
              onPressed: () {
                // logique mot de passe oublié
              },
              child: const Text("Mot de passe oublié ?", style: TextStyle(color: Color(0xFF7BC1B7)),),
            ),
          ],
        ),
      )
  );
}
  Widget _buildTextField({
    required String hintText,
    bool isPassword = false,
    IconData? suffixIcon,
  }) {
    return TextFormField(
      obscureText: isPassword,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.black26),
        contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
        suffixIcon: suffixIcon != null
            ? Icon(suffixIcon, color: Colors.black26)
            : null,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Colors.black12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Color(0xFF1193AB)),
        ),
      ),
    );
  }
}