import 'package:flutter/material.dart';
import 'package:pharmascan/Pages/PageDeScan.dart';
import 'package:pharmascan/Pages/homepage.dart';
import 'package:pharmascan/Pages/pagesDeRecherche.dart';
import 'package:pharmascan/modele/ModelePharmacie.dart';
import 'package:pharmascan/Pages/profile.dart';
import 'package:pharmascan/widgets/BarDeNavigation.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  final ValueNotifier<Pharmacie?> _routeRequest = ValueNotifier(null);

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      Home(routeRequest: _routeRequest),
      SearchPage(onPharmacySelected: _openRouteToPharmacy),
      PageDeScan(),
      ProfilePage(),
    ];
  }

  @override
  void dispose() {
    _routeRequest.dispose();
    super.dispose();
  }

  void _openRouteToPharmacy(Pharmacie pharmacie) {
    setState(() {
      _currentIndex = 0;
    });

    _routeRequest.value = null;
    _routeRequest.value = pharmacie;
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(index: _currentIndex, children: _pages),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: CustomBottomNav(
              currentIndex: _currentIndex,
              onTap: _onTabSelected,
            ),
          ),
        ],
      ),
    );
  }
}
