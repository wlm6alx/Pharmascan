import 'package:flutter/material.dart';



class PageInscription extends StatefulWidget{
  const PageInscription({super.key});

  @override
  State<PageInscription> createState()=> _InscriptionPageState();
}

  class _InscriptionPageState extends State<PageInscription>
  {
  bool MotDePasseCache =true ;
  bool TermsAccepter = false ;

  @override
    Widget build (BuildContext context) {
    final PrimaryColor = const Color(0xFF7EC6BD) ;

        return Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            elevation: 0,
            backgroundColor: Colors.white,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back,color: Colors.black),
              onPressed: ()=>Navigator.pop(context),
            ),
          )
        );
  }
  }