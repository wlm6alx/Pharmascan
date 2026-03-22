// Codes téléphoniques internationaux avec drapeaux
export const phoneCodes = {
  'CM': { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
  'FR': { code: '+33', flag: '🇫🇷', name: 'France' },
  'US': { code: '+1', flag: '🇺🇸', name: 'États-Unis' },
  'GB': { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  'BE': { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  'CH': { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  'CA': { code: '+1', flag: '🇨🇦', name: 'Canada' },
  'DE': { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  'IT': { code: '+39', flag: '🇮🇹', name: 'Italie' },
  'ES': { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  'SN': { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
  'CI': { code: '+225', flag: '🇨🇮', name: "Côte d'Ivoire" },
  'GA': { code: '+241', flag: '🇬🇦', name: 'Gabon' },
  'CD': { code: '+243', flag: '🇨🇩', name: 'RD Congo' },
  'CG': { code: '+242', flag: '🇨🇬', name: 'Congo' },
  'TD': { code: '+235', flag: '🇹🇩', name: 'Tchad' },
  'CF': { code: '+236', flag: '🇨🇫', name: 'RCA' },
  'GQ': { code: '+240', flag: '🇬🇶', name: 'Guinée équatoriale' },
  'NG': { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  'NE': { code: '+227', flag: '🇳🇪', name: 'Niger' },
  'ML': { code: '+223', flag: '🇲🇱', name: 'Mali' },
  'BF': { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  'TG': { code: '+228', flag: '🇹🇬', name: 'Togo' },
  'BJ': { code: '+229', flag: '🇧🇯', name: 'Bénin' },
  'GN': { code: '+224', flag: '🇬🇳', name: 'Guinée' },
  'GW': { code: '+245', flag: '🇬🇼', name: 'Guinée-Bissau' },
  'MR': { code: '+222', flag: '🇲🇷', name: 'Mauritanie' },
  'DZ': { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  'TN': { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  'MA': { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  'EG': { code: '+20', flag: '🇪🇬', name: 'Égypte' },
  'KE': { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  'ZA': { code: '+27', flag: '🇿🇦', name: 'Afrique du Sud' },
  'GH': { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  'ET': { code: '+251', flag: '🇪🇹', name: 'Éthiopie' },
  'UG': { code: '+256', flag: '🇺🇬', name: 'Ouganda' },
  'TZ': { code: '+255', flag: '🇹🇿', name: 'Tanzanie' },
  'AO': { code: '+244', flag: '🇦🇴', name: 'Angola' },
  'MZ': { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
  'ZW': { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  'ZM': { code: '+260', flag: '🇿🇲', name: 'Zambie' },
  'MW': { code: '+265', flag: '🇲🇼', name: 'Malawi' },
  'BW': { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  'NA': { code: '+264', flag: '🇳🇦', name: 'Namibie' },
  'RW': { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  'BI': { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  'DJ': { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
  'SO': { code: '+252', flag: '🇸🇴', name: 'Somalie' },
  'ER': { code: '+291', flag: '🇪🇷', name: 'Érythrée' },
  'SD': { code: '+249', flag: '🇸🇩', name: 'Soudan' },
  'SS': { code: '+211', flag: '🇸🇸', name: 'Soudan du Sud' },
  'LY': { code: '+218', flag: '🇱🇾', name: 'Libye' },
  'LR': { code: '+231', flag: '🇱🇷', name: 'Liberia' },
  'SL': { code: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
  'GM': { code: '+220', flag: '🇬🇲', name: 'Gambie' },
  'CV': { code: '+238', flag: '🇨🇻', name: 'Cap-Vert' },
  'ST': { code: '+239', flag: '🇸🇹', name: 'São Tomé-et-Príncipe' },
  'MU': { code: '+230', flag: '🇲🇺', name: 'Maurice' },
  'SC': { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
  'KM': { code: '+269', flag: '🇰🇲', name: 'Comores' },
  'MG': { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
  'RE': { code: '+262', flag: '🇷🇪', name: 'La Réunion' },
  'YT': { code: '+262', flag: '🇾🇹', name: 'Mayotte' },
}

export const getPhoneCode = (countryCode) => {
  return phoneCodes[countryCode] || { code: '+237', flag: '🇨🇲', name: 'Cameroun' }
}

export const getPhoneCodesList = () => {
  return Object.entries(phoneCodes)
    .map(([code, data]) => ({
      countryCode: code,
      phoneCode: data.code,
      flag: data.flag,
      name: data.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}


