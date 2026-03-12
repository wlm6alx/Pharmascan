import 'package:flutter/material.dart';

class PageDeScan extends StatefulWidget {
  const PageDeScan({super.key});

  @override
  State<PageDeScan> createState() => _PageDeScanState();
}

class _PageDeScanState extends State<PageDeScan> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Page de Scan')),
      body: Center(child: Text("data")),
    );
  }
}
