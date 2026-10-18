/**
 * Kshitij EMR - GPS Radar Demo Fixtures & Ambulance Adapter
 * Verified Anchor: 80 Feet Road, Brookes Haven Layout, JP Nagar Phase 8, Bengaluru, 560076
 * Exact Landmarks: RVITM / Epitome Elan / Tara Cafe / Krishna Nagar Kere
 * 
 * Strict Demo-Mode Boundary: All vehicle coordinates and availability states
 * are clearly marked as DEMO SIMULATION.
 */

export const DEMO_ANCHOR = {
  name: '80 Feet Road, 4th Block, Koramangala, Bengaluru',
  address: '80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
  lat: 12.9352,
  lng: 77.6244,
  locality: '4th Block, Koramangala',
  pincode: '560034',
  landmark: 'Adjacent to Sony World Signal & St. John’s Medical College',
  defaultRadiusKm: 5.0
};

export const ALTERNATIVE_LOCATIONS = [
  {
    id: 'LOC-KORAMANGALA-4TH',
    label: '80 Feet Rd / Koramangala 4th Block (Default)',
    lat: 12.9352,
    lng: 77.6244,
    landmark: '80 Feet Road, 4th Block, Koramangala'
  },
  {
    id: 'LOC-SONY-WORLD-SIGNAL',
    label: 'Sony World Signal / 100 Feet Road',
    lat: 12.9365,
    lng: 77.6268,
    landmark: '100 Feet Rd & 80 Feet Rd Koramangala Junction'
  },
  {
    id: 'LOC-ST-JOHNS-TRAUMA',
    label: 'St. John’s Medical College & Trauma Center',
    lat: 12.9315,
    lng: 77.6210,
    landmark: 'St. John’s Level-1 Trauma Resuscitation Gate'
  },
  {
    id: 'LOC-WIPRO-PARK',
    label: 'Wipro Park / 1st Block Koramangala',
    lat: 12.9308,
    lng: 77.6315,
    landmark: 'Wipro Park Perimeter, Koramangala 1st Block'
  },
  {
    id: 'LOC-KORAMANGALA-BDA',
    label: 'Koramangala BDA Complex / 3rd Block',
    lat: 12.9325,
    lng: 77.6180,
    landmark: 'BDA Commercial Complex, 3rd Block Koramangala'
  },
  {
    id: 'LOC-FORUM-HOSUR',
    label: 'Nexus Koramangala (Forum) / Hosur Road',
    lat: 12.9348,
    lng: 77.6115,
    landmark: 'Hosur Main Road / Koramangala Checkpost Junction'
  }
];

export const VERIFIED_HOSPITALS = [
  {
    hospital_id: 'HOSP-ST-JOHNS',
    name: 'St. John’s Medical College Hospital',
    address: 'Sarjapur Main Rd, John Nagar, Koramangala, Bengaluru 560034',
    lat: 12.9315,
    lng: 77.6210,
    phone: '+91 80 2206 5000',
    capabilities: ['Level-1 Emergency Trauma Care', '24/7 Casualty', 'Critical Resus ICU', 'Blood Bank'],
    total_beds: 1200,
    icu_available: 42,
    triage_compatibility: ['IMMEDIATE_RED', 'DELAYED_YELLOW'],
    verified: true
  },
  {
    hospital_id: 'HOSP-APOLLO-SPECTRA',
    name: 'Apollo Spectra Hospitals, Koramangala',
    address: '5th Block, 143, 1st Cross Rd, KHB Colony, Koramangala, Bengaluru 560095',
    lat: 12.9344,
    lng: 77.6292,
    phone: '+91 80 4333 5555',
    capabilities: ['Emergency Critical Care', 'Orthopedic Trauma', 'Surgical Resus', 'ICU'],
    total_beds: 95,
    icu_available: 8,
    triage_compatibility: ['IMMEDIATE_RED', 'DELAYED_YELLOW'],
    verified: true
  },
  {
    hospital_id: 'HOSP-BEAMS-KORA',
    name: 'Beams Multi Speciality Hospital, Koramangala',
    address: '6th Block, 80 Feet Road, Koramangala, Bengaluru 560095',
    lat: 12.9330,
    lng: 77.6260,
    phone: '+91 80 2552 1100',
    capabilities: ['24/7 Casualty', 'Trauma Stabilization', 'Emergency OT', 'ICU'],
    total_beds: 75,
    icu_available: 6,
    triage_compatibility: ['IMMEDIATE_RED', 'DELAYED_YELLOW'],
    verified: true
  },
  {
    hospital_id: 'HOSP-MANIPAL-SARJ',
    name: 'Manipal Hospital, Sarjapur Road',
    address: 'Sarjapur Main Rd, Iblur Junction, Bengaluru 560102',
    lat: 12.9260,
    lng: 77.6350,
    phone: '+91 80 2502 4444',
    capabilities: ['Level-1 Trauma', 'Cardiac Resuscitation', 'Emergency ICU', 'ECMO'],
    total_beds: 350,
    icu_available: 22,
    triage_compatibility: ['IMMEDIATE_RED', 'DELAYED_YELLOW'],
    verified: true
  },
  {
    hospital_id: 'HOSP-KAVERI-MADI',
    name: 'Kaveri Multi Speciality Hospital, Madiwala',
    address: 'Hosur Main Rd, Madiwala Junction, Bengaluru 560068',
    lat: 12.9230,
    lng: 77.6200,
    phone: '+91 80 2553 4400',
    capabilities: ['Emergency Polytrauma', 'Neuro-trauma', 'ICU', 'Dialysis'],
    total_beds: 140,
    icu_available: 12,
    triage_compatibility: ['DELAYED_YELLOW', 'MINIMAL_GREEN'],
    verified: true
  },
  {
    hospital_id: 'HOSP-JAYADEVA',
    name: 'Jayadeva Institute of Cardiovascular Sciences',
    address: 'Bannerghatta Main Rd, Jayanagar 9th Block, Bengaluru 560069',
    lat: 12.918510,
    lng: 77.598280,
    phone: '+91 80 2297 7400',
    capabilities: ['Autonomous Cardiac Emergency', 'Coronary Care Unit', 'ECMO'],
    total_beds: 600,
    icu_available: 25,
    triage_compatibility: ['IMMEDIATE_RED'],
    verified: true
  }
];

export const VERIFIED_MEDICAL_SHOPS = [
  {
    shop_id: 'SHOP-MEDPLUS-80FT',
    name: 'MedPlus Pharmacy — 80 Feet Road (Koramangala 4th Block)',
    short_name: 'MedPlus Rx',
    address: '80 Feet Road, 4th Block, Koramangala, Bengaluru 560034',
    lat: 12.9356,
    lng: 77.6240,
    phone: '+91 80 2553 4101',
    operating_hours: '24/7 Day & Night Emergency Pharmacy',
    is_24x7: true,
    capabilities: ['Emergency Resus Kits', 'TXA Injection', 'Normal Saline IV', 'Antibiotics'],
    verified: true
  },
  {
    shop_id: 'SHOP-APOLLO-SONY',
    name: 'Apollo Pharmacy — 100 Feet Road (Sony World Signal)',
    short_name: 'Apollo Rx',
    address: '100 Feet Road, Near Sony World Signal, Koramangala 4th Block, Bengaluru 560034',
    lat: 12.9360,
    lng: 77.6265,
    phone: '+91 80 2553 5522',
    operating_hours: '24/7 Emergency Operation',
    is_24x7: true,
    capabilities: ['Epinephrine (1:1000)', 'Naloxone / Narcan', 'Critical Cardiac Drugs'],
    verified: true
  },
  {
    shop_id: 'SHOP-WELLNESS-KORA',
    name: 'Wellness Forever 24x7 Chemist (Koramangala)',
    short_name: 'Wellness 24x7',
    address: '80 Feet Road, Near Maharaja Signal, Koramangala 4th Block, Bengaluru 560034',
    lat: 12.9348,
    lng: 77.6235,
    phone: '+91 80 4322 8800',
    operating_hours: '24/7 Day & Night Chemist',
    is_24x7: true,
    capabilities: ['Cold Chain Storage', 'Atropine Sulfate', 'IV Infusion Sets', 'First Aid'],
    verified: true
  },
  {
    shop_id: 'SHOP-STJOHNS-DISP',
    name: 'St. John’s Hospital 24/7 Casualty Pharmacy',
    short_name: 'St. John’s Rx',
    address: 'St. John’s Hospital Campus, Sarjapur Road, Koramangala, Bengaluru 560034',
    lat: 12.9315,
    lng: 77.6210,
    phone: '+91 80 2206 5000',
    operating_hours: '24/7 Hospital Trauma Dispensary',
    is_24x7: true,
    capabilities: ['Level-1 Trauma Packs', 'Blood Units Matching', 'Critical Care Vials'],
    verified: true
  },
  {
    shop_id: 'SHOP-SANJIVANI-5TH',
    name: 'Sanjivani Medical & General Stores (Koramangala 5th Block)',
    short_name: 'Sanjivani Rx',
    address: 'KHB Colony, 5th Block, Koramangala, Bengaluru 560095',
    lat: 12.9340,
    lng: 77.6185,
    phone: '+91 80 2553 1144',
    operating_hours: '07:30 - 23:30 (Open Now)',
    is_24x7: false,
    capabilities: ['General First Aid', 'Splints & Bandages', 'Burn Relief Dressings'],
    verified: true
  },
  {
    shop_id: 'SHOP-JAN-AUSHADHI-6TH',
    name: 'Pradhan Mantri Jan Aushadhi Kendra (Koramangala 6th Block)',
    short_name: 'Jan Aushadhi',
    address: '6th Block, Near BDA Complex, Koramangala, Bengaluru 560095',
    lat: 12.9375,
    lng: 77.6215,
    phone: '+91 80 2553 3399',
    operating_hours: '08:00 - 21:00 (Open Now)',
    is_24x7: false,
    capabilities: ['Bio-equivalent Generics', 'Subsidized Essential Medicines'],
    verified: true
  }
];

export const INITIAL_AMBULANCES = [
  {
    ambulance_id: 'AMB-01',
    callsign: 'Koramangala ALS Alpha-1',
    vehicle_type: 'ALS (Advanced Life Support)',
    lat: 12.9358,
    lng: 77.6248,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 180,
    speed_kmh: 32.0,
    last_gps_update: '4s ago',
    crew: 'Medic R. Nayak, Pilot S. Rao',
    equipment: ['Ventilator', 'Defibrillator', 'IV Pumps', 'Combat Gauze'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-02',
    callsign: 'St. John’s Gate BLS Beta-2',
    vehicle_type: 'BLS (Basic Life Support)',
    lat: 12.9320,
    lng: 77.6215,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 45,
    speed_kmh: 28.0,
    last_gps_update: '10s ago',
    crew: 'EMT V. Gowda, Pilot M. Kumar',
    equipment: ['Oxygen Resuscitator', 'Splints', 'Spine Board'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-03',
    callsign: 'Sony World MICU Critical-3',
    vehicle_type: 'MICU (Mobile ICU)',
    lat: 12.9370,
    lng: 77.6272,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 220,
    speed_kmh: 35.0,
    last_gps_update: '3s ago',
    crew: 'Dr. P. Hegde (ER Phys), Medic C. Das',
    equipment: ['Transport Vent', 'Blood Warmer', 'Ultrasound', 'Multipara Monitor'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-04',
    callsign: 'Wipro Park ALS-4',
    vehicle_type: 'ALS (Advanced Life Support)',
    lat: 12.9312,
    lng: 77.6310,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 310,
    speed_kmh: 30.0,
    last_gps_update: '7s ago',
    crew: 'Paramedic K. Sharma, Pilot A. Joshi',
    equipment: ['Defibrillator', 'LUCAS CPR', 'Suction Unit'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-05',
    callsign: 'Koramangala 5th BLS Patrol-5',
    vehicle_type: 'BLS (Basic Life Support)',
    lat: 12.9345,
    lng: 77.6190,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 90,
    speed_kmh: 34.0,
    last_gps_update: '12s ago',
    crew: 'EMT-P N. Reddy, Pilot T. Babu',
    equipment: ['Defib Monitor', 'Chest Seals', 'TXA Kit'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-06',
    callsign: 'Nexus Forum Rapid BLS-6',
    vehicle_type: 'BLS (Basic Life Support)',
    lat: 12.9350,
    lng: 77.6120,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 160,
    speed_kmh: 26.0,
    last_gps_update: '18s ago',
    crew: 'EMT D. Patil, Pilot B. Suresh',
    equipment: ['C-Collar', 'First Aid Kit', 'Automated Defib'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-07',
    callsign: 'Sarjapur Rd MICU-7',
    vehicle_type: 'MICU (Mobile ICU)',
    lat: 12.9280,
    lng: 77.6330,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 130,
    speed_kmh: 38.0,
    last_gps_update: '5s ago',
    crew: 'Dr. A. Verma, Medic E. Paul',
    equipment: ['ICU Ventilator', 'Infusion Pumps', 'Capnography'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-08',
    callsign: 'Madiwala Junction BLS-8',
    vehicle_type: 'BLS (Basic Life Support)',
    lat: 12.9240,
    lng: 77.6210,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 260,
    speed_kmh: 30.0,
    last_gps_update: '20s ago',
    crew: 'EMT R. Mohan, Pilot G. Prasad',
    equipment: ['Spine Board', 'Oxygen Delivery', 'Tourniquets'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-09',
    callsign: 'Apollo Spectra Depot ALS-9',
    vehicle_type: 'ALS (Advanced Life Support)',
    lat: 12.9340,
    lng: 77.6290,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 210,
    speed_kmh: 35.0,
    last_gps_update: '14s ago',
    crew: 'Medic L. Fernandez, Pilot K. John',
    equipment: ['Multi-Lead ECG', 'Emergency Drug Kit', 'EZ-IO'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-10',
    callsign: 'Koramangala 3rd Block BLS-10',
    vehicle_type: 'BLS (Basic Life Support)',
    lat: 12.9330,
    lng: 77.6185,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 180,
    speed_kmh: 29.0,
    last_gps_update: '25s ago',
    crew: 'EMT S. Bhat, Pilot H. Ali',
    equipment: ['Splints', 'Stretcher', 'Basic Airway Kit'],
    stale_gps: false
  },
  {
    ambulance_id: 'AMB-11',
    callsign: 'Agram Reserve ALS-11 (Offline)',
    vehicle_type: 'ALS (Advanced Life Support)',
    lat: 12.9420,
    lng: 77.6200,
    status: 'OFFLINE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 0,
    speed_kmh: 0.0,
    last_gps_update: '8m ago',
    crew: 'Maintenance Shift',
    equipment: ['Depot Service Pending'],
    stale_gps: true
  },
  {
    ambulance_id: 'AMB-12',
    callsign: 'Hosur Road MICU-12 (Stale GPS)',
    vehicle_type: 'MICU (Mobile ICU)',
    lat: 12.9290,
    lng: 77.6150,
    status: 'AVAILABLE',
    assignment_state: 'UNASSIGNED',
    assigned_emergency_id: null,
    heading: 90,
    speed_kmh: 0.0,
    last_gps_update: '9m ago',
    crew: 'Medic F. Joseph, Pilot N. Kumar',
    equipment: ['Full Mobile ICU Kit'],
    stale_gps: true
  }
];

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export function estimateRoadEtaMins(distanceKm, speedKmh = 35.0) {
  const urbanTrafficFactor = 1.35;
  const minutes = (distanceKm / Math.max(15.0, speedKmh)) * 60.0 * urbanTrafficFactor;
  return Math.max(1, Math.ceil(minutes));
}
