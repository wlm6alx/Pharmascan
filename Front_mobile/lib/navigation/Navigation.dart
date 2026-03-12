import 'package:flutter/material.dart';
import 'package:pharmascan/widgets/BarDeNavigation.dart';
import 'package:pharmascan/Pages/homepage.dart';
import 'package:pharmascan/Pages/pagesDeRecherche.dart';
import 'package:pharmascan/Pages/PageDeScan.dart';
import 'package:pharmascan/Pages/prolife_page.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [Home(), SearchPage(), PageDeScan(), ProfilePage()];
  }

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: CustomBottomNav(
        currentIndex: _currentIndex,
        onTap: _onTabSelected,
      ),
    );
  }
}
