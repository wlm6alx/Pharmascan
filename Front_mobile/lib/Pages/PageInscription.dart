import 'package:flutter/material.dart';

class PageInscription extends StatefulWidget {
  const PageInscription({super.key});

  @override
  State<PageInscription> createState() => _InscriptionPageState();
}

class _InscriptionPageState extends State<PageInscription> {
  bool MotDePasseCache = true;
  bool TermsAccepter = false;

  @override
  Widget build(BuildContext context) {
    // final PrimaryColor = const Color(0xFF7BC1B7) ;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF7BC1B7)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'INSCRIPTION',
          style: TextStyle(
            color: Color(0xFF7BC1B7),
            fontWeight: FontWeight.w400,
            fontSize: 18,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0),
        child: Column(
          children: [
            const SizedBox(height: 20),

            // Champ Nom d'utilisation
            _buildTextField(hintText: "Nom d'utilisateur"),
            const SizedBox(height: 15),

            // Champ Adresse mail
            _buildTextField(hintText: "Adresse mail"),
            const SizedBox(height: 15),

            // Champ de mot de passe (réutilisable)
            _buildTextField(
              hintText: "Mot de passe",
              isPassword: MotDePasseCache,
              onTogglePassword: () {
                setState(() {
                  MotDePasseCache = !MotDePasseCache;
                });
              },
            ),
            const SizedBox(height: 20),

            //Texte de confirmation des licences et confidencialité
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 24,
                  width: 24,
                  child: Checkbox(
                    value: TermsAccepter,
                    activeColor: Colors.blue,
                    onChanged: (bool? value) {
                      setState(() {
                        TermsAccepter = value!;
                      });
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: const TextStyle(
                        color: Colors.grey,
                        fontSize: 13,
                        height: 1.4,
                      ),
                      children: [
                        const TextSpan(
                          text: "Je confirme avoir lu et accepté les ",
                        ),
                        TextSpan(
                          text: "termes du contrat",
                          style: TextStyle(
                            color: Colors.blue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const TextSpan(text: "et"),
                        TextSpan(
                          text: "la politique de confidencialité",
                          style: TextStyle(
                            color: Colors.blue,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const TextSpan(text: " et avoir plus de 18 ans"),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 30),
            //Boutton s'inscrire
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Color(0xFF7BC1B7),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  "S'inscrire",
                  style: TextStyle(color: Colors.white, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String hintText,
    bool isPassword = false,
    IconData? suffixIcon,
    VoidCallback? onTogglePassword,
  }) {
    return TextFormField(
      obscureText: isPassword,
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(color: Colors.black26),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 15,
          vertical: 15,
        ),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  isPassword ? Icons.visibility_off_outlined : Icons.visibility,
                  color: Colors.black26,
                ),
                onPressed: onTogglePassword,
              )
            : (suffixIcon != null
                  ? Icon(suffixIcon, color: Colors.black26)
                  : null),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Colors.black12),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.green),
        ),
      ),
    );
  }
}
