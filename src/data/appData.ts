import { GeoPoint, VehicleOption, DriverProfile, SimulatedDriverMarker } from '../types';

export const POPULAR_LOCATIONS: GeoPoint[] = [
  {
    name: 'Sector V Metro Station (Gate 2)',
    address: 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal',
    landmark: 'Opposite RDB Cinemas & Metro Pillar 42',
    lat: 22.5804,
    lng: 88.4378,
    zone: 'Metro Transit'
  },
  {
    name: 'City Centre 1 Mall',
    address: 'DC Block, Sector 1, Bidhannagar, Kolkata, West Bengal',
    landmark: 'Main Entrance Gate 1, Kund Area',
    lat: 22.5898,
    lng: 88.4087,
    zone: 'Shopping & Leisure'
  },
  {
    name: 'Karunamoyee Bus & Metro Terminal',
    address: 'Central Park East, Salt Lake, Kolkata, West Bengal',
    landmark: 'Near Bikas Bhavan & Central Park Gate 3',
    lat: 22.5866,
    lng: 88.4208,
    zone: 'Bus & Metro'
  },
  {
    name: 'DLF 2 IT Park',
    address: 'Action Area II, New Town, Kolkata, West Bengal',
    landmark: 'Near Akankha More & Tata Medical Center',
    lat: 22.5936,
    lng: 88.4725,
    zone: 'IT & Offices'
  },
  {
    name: 'Eco Space Business Park',
    address: 'Plot IIF/11, Action Area II, New Town, Kolkata, West Bengal',
    landmark: 'Amity University Road',
    lat: 22.5865,
    lng: 88.4878,
    zone: 'IT & Offices'
  },
  {
    name: 'City Centre 2 (Rajarhat)',
    address: 'Action Area IID, Rajarhat, Kolkata, West Bengal',
    landmark: 'Near Chinar Park Crossing',
    lat: 22.6312,
    lng: 88.4485,
    zone: 'Shopping & Leisure'
  },
  {
    name: 'Park Street Metro & Dining',
    address: 'Park Street, Chowringhee, Kolkata, West Bengal',
    landmark: 'Near Flurys & Apeejay House',
    lat: 22.5535,
    lng: 88.3518,
    zone: 'Heritage & Dining'
  },
  {
    name: 'Gariahat More Crossing',
    address: 'Gariahat Road, Ballygunge, Kolkata, West Bengal',
    landmark: 'Near Gariahat Flyover Market & Pantaloons',
    lat: 22.5186,
    lng: 88.3664,
    zone: 'Shopping & Transit'
  },
  {
    name: 'Jadavpur 8B Bus Stand',
    address: 'Raja SC Mullick Road, Jadavpur, Kolkata, West Bengal',
    landmark: 'Opposite Jadavpur University Main Gate',
    lat: 22.4988,
    lng: 88.3718,
    zone: 'Transit & University'
  },
  {
    name: 'Shyambazar Five-Point Crossing',
    address: 'Bhupen Bose Avenue, Shyambazar, Kolkata, West Bengal',
    landmark: 'Near Netaji Statue & Shyambazar Metro Gate 1',
    lat: 22.6025,
    lng: 88.3715,
    zone: 'North Kolkata Hub'
  },
  {
    name: 'Dum Dum Junction & Metro',
    address: 'Dum Dum Road, Motijheel, Kolkata, West Bengal',
    landmark: 'Near Dum Dum Metro Platform 1',
    lat: 22.6214,
    lng: 88.3934,
    zone: 'Transit Junction'
  },
  {
    name: 'Apollo Multispeciality Hospital',
    address: '58 Canal Circular Road, Kadapara, Kolkata, West Bengal',
    landmark: 'EM Bypass Junction',
    lat: 22.5732,
    lng: 88.3982,
    zone: 'Healthcare'
  },
  {
    name: 'Howrah Railway Station',
    address: 'Station Road, Howrah, West Bengal',
    landmark: 'Old Complex & New Complex Terminal',
    lat: 22.5840,
    lng: 88.3426,
    zone: 'Railway Terminal'
  },
  {
    name: 'Sealdah Railway & Metro Station',
    address: 'Acharya Prafulla Chandra Road, Sealdah, Kolkata, West Bengal',
    landmark: 'Kaiser Street Junction',
    lat: 22.5675,
    lng: 88.3712,
    zone: 'Railway Terminal'
  }
];

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    id: 'toto',
    name: 'Toto Partner Electric',
    tagline: 'Eco-friendly E-Rickshaw for short & daily hops',
    iconType: 'toto',
    capacity: '3 Seats',
    etaMins: 2,
    baseFare: 25,
    perKmRate: 16.0,
    ecoFriendly: true,
    badge: 'Popular & Green ⚡',
    description: 'Zero emission, quick neighborhood navigation, budget friendly'
  },
  {
    id: 'toto_express',
    name: 'Toto Express Direct',
    tagline: 'Direct point-to-point without intermediate stops',
    iconType: 'express',
    capacity: '3 Seats',
    etaMins: 3,
    baseFare: 30,
    perKmRate: 18.0,
    ecoFriendly: true,
    badge: 'Fast Route 🚀',
    description: 'Guaranteed non-stop priority ride for urgent commutes'
  },
  {
    id: 'bike',
    name: 'Rapido Bike',
    tagline: 'Beat city traffic in solo style',
    iconType: 'bike',
    capacity: '1 Helmeted Seat',
    etaMins: 1,
    baseFare: 30,
    perKmRate: 14.0,
    badge: 'Quickest ⚡',
    description: 'Fastest way through narrow lanes and rush hour traffic'
  },
  {
    id: 'auto',
    name: 'Rapido Auto',
    tagline: 'Standard CNG 3-wheeler for family/luggage',
    iconType: 'auto',
    capacity: '3-4 Seats',
    etaMins: 4,
    baseFare: 40,
    perKmRate: 20.0,
    description: 'Spacious auto with metered fare reliability'
  }
];

// Initial verified Toto Partner drivers in Kolkata to seed Firestore if empty
export const SEED_DRIVERS: DriverProfile[] = [
  {
    id: 'drv_subhashish',
    name: 'Subhashish Mondal',
    phone: '+91 98745 22019',
    vehicleType: 'toto',
    vehicleNumber: 'WB-06-ER-4821',
    vehicleModel: 'GreenPower Lithium E-Toto Deluxe',
    vehicleColor: 'Emerald Green',
    pin: '1234',
    approvalStatus: 'approved',
    rating: 4.94,
    totalTrips: 1248,
    batteryPercentage: 92,
    todayEarnings: 1240,
    acceptanceRate: 98,
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    driverPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    totoPhoto: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=320&auto=format&fit=crop&q=80',
    totoPhotos: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=320&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=320&auto=format&fit=crop&q=80'
    ],
    kycVerified: true,
    currentLat: 22.5815,
    currentLng: 88.4365,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'drv_ratan',
    name: 'Ratan Karmakar',
    phone: '+91 98319 88301',
    vehicleType: 'toto',
    vehicleNumber: 'WB-25-ET-9104',
    vehicleModel: 'CityRide Eco-Toto Plus',
    vehicleColor: 'Canary Yellow',
    pin: '1234',
    approvalStatus: 'approved',
    rating: 4.88,
    totalTrips: 830,
    batteryPercentage: 84,
    todayEarnings: 840,
    acceptanceRate: 94,
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    driverPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    totoPhoto: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=320&auto=format&fit=crop&q=80',
    totoPhotos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=320&auto=format&fit=crop&q=80'],
    kycVerified: true,
    currentLat: 22.5788,
    currentLng: 88.4390,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'drv_bappa',
    name: 'Bappa Paul',
    phone: '+91 98302 11984',
    vehicleType: 'toto',
    vehicleNumber: 'WB-08-ER-3921',
    vehicleModel: 'Kinetic Green Zing E-Rickshaw',
    vehicleColor: 'Electric Blue',
    pin: '1234',
    approvalStatus: 'approved',
    rating: 4.92,
    totalTrips: 1410,
    batteryPercentage: 96,
    todayEarnings: 1460,
    acceptanceRate: 99,
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    driverPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    totoPhoto: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=320&auto=format&fit=crop&q=80',
    totoPhotos: ['https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=320&auto=format&fit=crop&q=80'],
    kycVerified: true,
    currentLat: 22.5835,
    currentLng: 88.4340,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'drv_joydeb',
    name: 'Joydeb Das',
    phone: '+91 98366 45091',
    vehicleType: 'toto',
    vehicleNumber: 'WB-02-ER-7712',
    vehicleModel: 'Saarthi Shavak E-Rickshaw',
    vehicleColor: 'Saffron Orange',
    pin: '1234',
    approvalStatus: 'approved',
    rating: 4.82,
    totalTrips: 650,
    batteryPercentage: 78,
    todayEarnings: 720,
    acceptanceRate: 92,
    isOnline: true,
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    driverPhoto: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    totoPhoto: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=320&auto=format&fit=crop&q=80',
    totoPhotos: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=320&auto=format&fit=crop&q=80'],
    kycVerified: true,
    currentLat: 22.5850,
    currentLng: 88.4395,
    updatedAt: new Date().toISOString()
  }
];

export const PROMO_CODES: Record<string, { code: string; discountPct: number; maxDiscount: number; minFare: number; desc: string }> = {
  RAPIDOTOTO: { code: 'RAPIDOTOTO', discountPct: 25, maxDiscount: 20, minFare: 25, desc: '25% OFF up to ₹20 on any Toto ride' },
  GREENRIDE: { code: 'GREENRIDE', discountPct: 20, maxDiscount: 15, minFare: 20, desc: '₹15 ECO rebate for choosing E-Rickshaw' },
  WELCOME50: { code: 'WELCOME50', discountPct: 50, maxDiscount: 35, minFare: 30, desc: '50% OFF up to ₹35 on 1st booking' }
};
