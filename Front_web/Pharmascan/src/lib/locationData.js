// Utilisation hybride : données précises pour le Cameroun + bibliothèque country-state-city pour les autres pays
import { Country, State, City } from 'country-state-city'

// ===== DONNÉES PRÉCISES POUR LE CAMEROUN =====

// Régions du Cameroun (10 régions)
export const cameroonRegions = [
  { code: 'AD', name: 'Adamaoua' },
  { code: 'CE', name: 'Centre' },
  { code: 'ES', name: 'Est' },
  { code: 'EN', name: 'Extrême-Nord' },
  { code: 'LT', name: 'Littoral' },
  { code: 'NO', name: 'Nord' },
  { code: 'NW', name: 'Nord-Ouest' },
  { code: 'OU', name: 'Ouest' },
  { code: 'SU', name: 'Sud' },
  { code: 'SW', name: 'Sud-Ouest' },
]

// Départements par région (Cameroun)
export const cameroonDepartments = {
  AD: [
    { code: 'DJ', name: 'Djérem' },
    { code: 'FA', name: 'Faro-et-Déo' },
    { code: 'MA', name: 'Mayo-Banyo' },
    { code: 'MB', name: 'Mbéré' },
    { code: 'VN', name: 'Vina' },
  ],
  CE: [
    { code: 'HA', name: 'Haute-Sanaga' },
    { code: 'LE', name: 'Lekié' },
    { code: 'MB', name: 'Mbam-et-Inoubou' },
    { code: 'MK', name: 'Mbam-et-Kim' },
    { code: 'ME', name: 'Méfou-et-Afamba' },
    { code: 'MF', name: 'Méfou-et-Akono' },
    { code: 'MM', name: 'Mfoundi' },
    { code: 'NY', name: 'Nyong-et-Kellé' },
    { code: 'NK', name: 'Nyong-et-Mfoumou' },
    { code: 'NS', name: 'Nyong-et-So\'o' },
  ],
  ES: [
    { code: 'BO', name: 'Boumba-et-Ngoko' },
    { code: 'HA', name: 'Haut-Nyong' },
    { code: 'KA', name: 'Kadey' },
    { code: 'LO', name: 'Lom-et-Djérem' },
  ],
  EN: [
    { code: 'DI', name: 'Diamaré' },
    { code: 'LO', name: 'Logone-et-Chari' },
    { code: 'MA', name: 'Mayo-Danay' },
    { code: 'MK', name: 'Mayo-Kani' },
    { code: 'MS', name: 'Mayo-Sava' },
    { code: 'MT', name: 'Mayo-Tsanaga' },
  ],
  LT: [
    { code: 'MO', name: 'Moungo' },
    { code: 'NK', name: 'Nkam' },
    { code: 'SA', name: 'Sanaga-Maritime' },
    { code: 'WO', name: 'Wouri' },
  ],
  NO: [
    { code: 'BE', name: 'Bénoué' },
    { code: 'FA', name: 'Faro' },
    { code: 'MA', name: 'Mayo-Louti' },
    { code: 'MR', name: 'Mayo-Rey' },
  ],
  NW: [
    { code: 'BO', name: 'Boyo' },
    { code: 'BU', name: 'Bui' },
    { code: 'DO', name: 'Donga-Mantung' },
    { code: 'ME', name: 'Menchum' },
    { code: 'MO', name: 'Momo' },
    { code: 'NG', name: 'Ngo-Ketunjia' },
  ],
  OU: [
    { code: 'BA', name: 'Bamboutos' },
    { code: 'HA', name: 'Hauts-Plateaux' },
    { code: 'KO', name: 'Koung-Khi' },
    { code: 'ME', name: 'Ménoua' },
    { code: 'MI', name: 'Mifi' },
    { code: 'ND', name: 'Ndé' },
    { code: 'NO', name: 'Noun' },
  ],
  SU: [
    { code: 'DJ', name: 'Dja-et-Lobo' },
    { code: 'MV', name: 'Mvila' },
    { code: 'OC', name: 'Océan' },
    { code: 'VA', name: 'Vallée-du-Ntem' },
  ],
  SW: [
    { code: 'FA', name: 'Fako' },
    { code: 'KU', name: 'Koupé-Manengouba' },
    { code: 'LE', name: 'Lebialem' },
    { code: 'MA', name: 'Manyu' },
    { code: 'ME', name: 'Meme' },
    { code: 'ND', name: 'Ndian' },
  ],
}

// Villes principales par département (Cameroun)
export const cameroonCities = {
  // Centre - Mfoundi (Yaoundé)
  MM: [
    'Yaoundé', 'Yaoundé I', 'Yaoundé II', 'Yaoundé III', 'Yaoundé IV', 'Yaoundé V', 'Yaoundé VI', 'Yaoundé VII',
    'Elig-Edzoa', 'Mbankomo', 'Mfou', 'Ngoumou', 'Obala', 'Okola', 'Soa'
  ],
  // Littoral - Wouri (Douala)
  WO: [
    'Douala', 'Douala I', 'Douala II', 'Douala III', 'Douala IV', 'Douala V',
    'Bonabéri', 'Logpom', 'Makepe', 'Ndogpassi', 'Pk8', 'Pk12'
  ],
  // Nord-Ouest - Bui (Kumbo)
  BU: [
    'Kumbo', 'Jakiri', 'Nkum', 'Mbiame', 'Nso', 'Oku'
  ],
  // Ouest - Mifi (Bafoussam)
  MI: [
    'Bafoussam I', 'Bafoussam II', 'Bafoussam III',
    'Bamougoum', 'Bangangté', 'Bangang', 'Bansoa', 'Batié', 'Bayangam'
  ],
  // Sud-Ouest - Fako (Limbé, Buea)
  FA: [
    'Limbé', 'Buea', 'Tiko', 'Idenau', 'Muyuka', 'Mungo'
  ],
  // Adamaoua - Vina (Ngaoundéré)
  VN: [
    'Ngaoundéré', 'Meiganga', 'Tibati', 'Djohong', 'Mbe', 'Nganha'
  ],
  // Extrême-Nord - Diamaré (Maroua)
  DI: [
    'Maroua I', 'Maroua II', 'Maroua III',
    'Bogo', 'Dargala', 'Gobo', 'Maga', 'Meri', 'Mokolo', 'Mora', 'Moulvoudaye', 'Petté', 'Waza'
  ],
  // Nord - Bénoué (Garoua)
  BE: [
    'Garoua I', 'Garoua II', 'Garoua III',
    'Bibemi', 'Dembo', 'Figuil', 'Gaschiga', 'Gashiga', 'Lagdo', 'Mayo-Hourna', 'Pitoa', 'Poli', 'Tcholliré'
  ],
  // Est - Haut-Nyong (Abong-Mbang)
  HA: [
    'Abong-Mbang', 'Dimako', 'Doumé', 'Lomié', 'Messamena', 'Mindourou', 'Ngoyla', 'Nguelemendouka'
  ],
  // Sud - Mvila (Ebolowa)
  MV: [
    'Ebolowa', 'Mvangan', 'Akom II', 'Biwong-Bulu', 'Biwong-Bane', 'Efoulan', 'Mengong', 'Ngoulemakong'
  ],
  // Autres départements - villes principales
  // Centre
  LE: ['Monatélé', 'Obala', 'Okola', 'Sa\'a'],
  MB: ['Bafia', 'Deuk', 'Kiiki', 'Ndikiniméki', 'Ombessa'], // Mbam-et-Inoubou
  ME: ['Mfou', 'Nkolafamba', 'Nkolmebanga', 'Nkolmetet', 'Ntui'], // Méfou-et-Afamba
  NY: ['Akonolinga', 'Ayos', 'Mbalmayo', 'Mengueme', 'Nanga-Eboko'],
  NK: ['Yabassi', 'Nkondjock', 'Nlonako'], // Nkam (Littoral) - mais aussi Nyong-et-Mfoumou (Centre)
  NS: ['Nyong-et-So\'o'], // Villes à compléter
  MF: ['Méfou-et-Akono'], // Villes à compléter
  // HA est déjà utilisé pour Haut-Nyong (Est)
  MK: ['Mbam-et-Kim'], // Villes à compléter - mais aussi Mayo-Kani (Extrême-Nord)
  
  // Littoral
  MO: ['Melong', 'Nkongsamba', 'Penja', 'Tonga'], // Moungo - mais aussi Momo (Nord-Ouest)
  SA: ['Edéa', 'Dizangué', 'Massock', 'Ngambe', 'Nyanon'], // Sanaga-Maritime
  
  // Nord
  // FA est déjà utilisé pour Fako (Sud-Ouest) et Faro-et-Déo (Adamaoua)
  // MA est déjà utilisé pour Mayo-Banyo (Adamaoua), Mayo-Danay (Extrême-Nord), Mayo-Louti (Nord), Manyu (Sud-Ouest)
  MR: ['Tcholliré', 'Rey Bouba', 'Touboro'], // Mayo-Rey
  
  // Nord-Ouest
  BO: ['Fundong', 'Belo', 'Njinikom'], // Boyo - mais aussi Boumba-et-Ngoko (Est)
  DO: ['Nkambé', 'Ako', 'Misaje'], // Donga-Mantung
  // ME est déjà utilisé pour Méfou-et-Afamba (Centre), Menchum (Nord-Ouest), Ménoua (Ouest), Meme (Sud-Ouest)
  // MO est déjà utilisé pour Moungo (Littoral) et Momo (Nord-Ouest)
  NG: ['Ndop', 'Babessi', 'Bamunka'], // Ngo-Ketunjia
  
  // Ouest
  BA: ['Mbouda', 'Bamougoum', 'Bangangté'], // Bamboutos
  // HA est déjà utilisé pour Haute-Sanaga (Centre), Haut-Nyong (Est), Hauts-Plateaux (Ouest)
  KO: ['Koung-Khi', 'Bana', 'Bafang'],
  // ME est déjà utilisé
  // ND est déjà utilisé pour Ndé (Ouest) et Ndian (Sud-Ouest)
  NO: ['Foumban', 'Foumbot', 'Koutaba'], // Noun
  
  // Sud
  DJ: ['Sangmélima', 'Meyomessala', 'Mvangan'], // Dja-et-Lobo - mais aussi Djérem (Adamaoua)
  OC: ['Kribi', 'Lolodorf', 'Mvengue'], // Océan
  VA: ['Ambam', 'Ma\'an', 'Olamze'], // Vallée-du-Ntem
  
  // Sud-Ouest
  // FA est déjà utilisé pour Fako
  KU: ['Bangem', 'Nguti', 'Tombel'], // Koupé-Manengouba
  // LE est déjà utilisé pour Lekié (Centre) et Lebialem (Sud-Ouest)
  // MA est déjà utilisé pour Manyu
  // ME est déjà utilisé pour Meme
  // ND est déjà utilisé pour Ndian
  
  // Est
  // BO est déjà utilisé pour Boumba-et-Ngoko
  // HA est déjà utilisé pour Haut-Nyong
  KA: ['Kadey'], // Villes à compléter
  LO: ['Lom-et-Djérem'], // Villes à compléter - mais aussi Logone-et-Chari (Extrême-Nord)
  
  // Adamaoua
  // DJ est déjà utilisé pour Djérem
  // FA est déjà utilisé pour Faro-et-Déo
  // MA est déjà utilisé pour Mayo-Banyo
  // MB est déjà utilisé pour Mbéré
  // VN est déjà utilisé pour Vina
  
  // Extrême-Nord
  // DI est déjà utilisé pour Diamaré
  // LO est déjà utilisé pour Logone-et-Chari
  // MA est déjà utilisé pour Mayo-Danay
  // MK est déjà utilisé pour Mayo-Kani
  MS: ['Mayo-Sava'], // Villes à compléter
  MT: ['Mayo-Tsanaga'], // Villes à compléter
}

// ===== FONCTIONS POUR LE CAMEROUN =====

export const getCameroonRegions = () => {
  return cameroonRegions
}

export const getCameroonDepartments = (regionCode) => {
  return cameroonDepartments[regionCode] || []
}

export const getCameroonCities = (departmentCode) => {
  const cities = cameroonCities[departmentCode] || []
  // Trier les villes pour mettre les principales en premier
  const sortedCities = [...cities].sort((a, b) => {
    // Mettre "Yaoundé" et "Douala" en premier
    if (a === 'Yaoundé' || a === 'Douala') return -1
    if (b === 'Yaoundé' || b === 'Douala') return 1
    return a.localeCompare(b)
  })
  return sortedCities.map(city => ({ name: city }))
}

// ===== FONCTIONS POUR LES AUTRES PAYS (country-state-city) =====

export const getAllCountries = () => {
  return Country.getAllCountries()
}

export const getStatesByCountry = (countryCode) => {
  if (!countryCode || countryCode === 'CM') return []
  return State.getStatesOfCountry(countryCode)
}

export const getCitiesByState = (countryCode, stateCode) => {
  if (!countryCode || !stateCode || countryCode === 'CM') return []
  return City.getCitiesOfState(countryCode, stateCode)
}

export const getCountryName = (countryCode) => {
  if (!countryCode) return ''
  if (countryCode === 'CM') return 'Cameroun'
  const country = Country.getCountryByCode(countryCode)
  return country ? country.name : ''
}

export const getStateName = (countryCode, stateCode) => {
  if (!countryCode || !stateCode) return ''
  if (countryCode === 'CM') {
    const region = cameroonRegions.find(r => r.code === stateCode)
    if (region) return region.name
    const dept = Object.values(cameroonDepartments).flat().find(d => d.code === stateCode)
    return dept ? dept.name : ''
  }
  const state = State.getStateByCodeAndCountry(stateCode, countryCode)
  return state ? state.name : ''
}

// ===== FONCTIONS FORMATTÉES POUR LES SÉLECTEURS =====

export const getFormattedCountries = () => {
  const countries = getAllCountries()
  return countries
    .map(country => ({
      code: country.isoCode,
      name: country.name,
    }))
    .sort((a, b) => {
      // Mettre le Cameroun en premier
      if (a.code === 'CM') return -1
      if (b.code === 'CM') return 1
      return a.name.localeCompare(b.name)
    })
}

export const getFormattedStates = (countryCode) => {
  if (countryCode === 'CM') {
    // Pour le Cameroun, retourner les régions
    return cameroonRegions.map(region => ({
      code: region.code,
      name: region.name,
    }))
  }
  const states = getStatesByCountry(countryCode)
  return states
    .map(state => ({
      code: state.isoCode,
      name: state.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const getFormattedCities = (countryCode, stateCode) => {
  if (countryCode === 'CM') {
    // Pour le Cameroun, retourner les villes du département
    return getCameroonCities(stateCode)
  }
  const cities = getCitiesByState(countryCode, stateCode)
  return cities
    .map(city => ({
      name: city.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Fonction pour obtenir toutes les villes d'un pays (sans filtre par état/région)
export const getAllCitiesByCountry = (countryCode) => {
  if (countryCode === 'CM') {
    // Pour le Cameroun, retourner toutes les villes principales
    const allCities = []
    Object.values(cameroonCities).forEach(cityList => {
      cityList.forEach(city => {
        if (!allCities.find(c => c.name === city)) {
          allCities.push({ name: city })
        }
      })
    })
    // Trier et mettre Yaoundé et Douala en premier
    return allCities.sort((a, b) => {
      if (a.name === 'Yaoundé' || a.name === 'Douala') return -1
      if (b.name === 'Yaoundé' || b.name === 'Douala') return 1
      return a.name.localeCompare(b.name)
    })
  }
  
  // Pour les autres pays, obtenir toutes les villes de tous les états
  const states = getStatesByCountry(countryCode)
  const allCities = []
  const cityMap = new Map()
  
  states.forEach(state => {
    const cities = getCitiesByState(countryCode, state.isoCode)
    cities.forEach(city => {
      if (!cityMap.has(city.name)) {
        cityMap.set(city.name, true)
        allCities.push({ name: city.name })
      }
    })
  })
  
  return allCities.sort((a, b) => a.name.localeCompare(b.name))
}

// Fonction pour obtenir les départements du Cameroun (pour l'affichage après la région)
export const getFormattedDepartments = (regionCode) => {
  if (!regionCode) return []
  return getCameroonDepartments(regionCode)
    .map(dept => ({
      code: dept.code,
      name: dept.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
