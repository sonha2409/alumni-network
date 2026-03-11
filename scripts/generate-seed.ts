/**
 * Generates supabase/seed.sql with 300 test users for map testing.
 *
 * Distribution:
 *   1   admin (Son Ha) — New York, NY
 *   100 Vietnam (focus Hanoi + HCM)
 *   50  USA (focus big cities)
 *   50  G7/G20/OECD countries
 *   49  Rest of world
 *   15  Hungary
 *   20  Russia
 *   10  Romania & Bulgaria
 *   5   Spain & Portugal
 *
 * Run: npx tsx scripts/generate-seed.ts > supabase/seed.sql
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function userId(n: number): string {
  // Admin = 1 → a0000000-0000-4000-8000-000000000001
  // test+N → a0000000-0000-4000-8000-000000100NNN (NNN = zero-padded decimal)
  if (n === 0) return 'a0000000-0000-4000-8000-000000000001';
  const pad = String(n).padStart(3, '0');
  return `a0000000-0000-4000-8000-000000100${pad}`;
}

function profileId(n: number): string {
  if (n === 0) return 'b0000000-0000-4000-8000-000000000001';
  const pad = String(n).padStart(3, '0');
  return `b0000000-0000-4000-8000-000000100${pad}`;
}

function email(n: number): string {
  if (n === 0) return 'admin@gmail.com';
  return `test${n}@gmail.com`;
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

// Jitter coordinates slightly so pins don't stack
function jitter(base: number, range: number, seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) % 1;
  return +(base + (x * range - range / 2)).toFixed(5);
}

// ---------------------------------------------------------------------------
// Name pools
// ---------------------------------------------------------------------------

const vnSurnames = [
  'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vo', 'Dang', 'Bui', 'Do', 'Ngo',
  'Duong', 'Ly', 'Ha', 'Truong', 'Dinh', 'Huynh', 'Lam', 'Mai', 'Cao', 'Vu',
];
const vnMaleFirst = [
  'Minh', 'Duc', 'Huy', 'Khoa', 'Vinh', 'Quang', 'Tuan', 'Long', 'Phuc', 'Dat',
  'Bao', 'Khanh', 'Trung', 'Thinh', 'Tai', 'Duy', 'Hung', 'Hai', 'Nam', 'An',
  'Hoang', 'Thanh', 'Binh', 'Loc', 'Son',
];
const vnFemaleFirst = [
  'Anh', 'Ngoc', 'Linh', 'Tam', 'Mai', 'Ngan', 'Phuong', 'Thao', 'Trang', 'Uyen',
  'Vy', 'Lan', 'Huong', 'Chi', 'Nhi', 'Hanh', 'Yen', 'Thi', 'Trinh', 'Khanh',
  'Tuyet', 'Hien', 'Diem', 'Truc', 'My',
];
const vnMiddle = ['Van', 'Thi', 'Minh', 'Quoc', 'Hoang', 'Kim', 'Thanh', 'Phuong', 'Viet', 'Ngoc'];

const westMaleFirst = [
  'James', 'David', 'Michael', 'Kevin', 'Daniel', 'Andrew', 'Ryan', 'Brian', 'Jason', 'Eric',
  'Steven', 'Chris', 'Mark', 'Robert', 'William', 'Alex', 'Thomas', 'Patrick', 'Sam', 'Tony',
];
const westFemaleFirst = [
  'Emily', 'Sarah', 'Jessica', 'Ashley', 'Amanda', 'Lauren', 'Rachel', 'Jennifer', 'Nicole', 'Megan',
  'Sophia', 'Olivia', 'Hannah', 'Grace', 'Victoria', 'Diana', 'Karen', 'Lisa', 'Anna', 'Chloe',
];

function vnName(idx: number): string {
  const surname = pick(vnSurnames, idx);
  const middle = pick(vnMiddle, idx + 3);
  const isFemale = idx % 2 === 0;
  const first = isFemale ? pick(vnFemaleFirst, idx + 7) : pick(vnMaleFirst, idx + 5);
  return `${surname} ${middle} ${first}`;
}

function intlName(idx: number): string {
  const isFemale = idx % 2 === 0;
  const surname = pick(vnSurnames, idx); // Many are Vietnamese diaspora
  if (idx % 3 === 0) {
    // Some non-Vietnamese names
    const first = isFemale ? pick(westFemaleFirst, idx) : pick(westMaleFirst, idx);
    const lastNames = ['Smith', 'Johnson', 'Lee', 'Kim', 'Chen', 'Wang', 'Park', 'Singh', 'Kumar', 'Garcia',
      'Mueller', 'Tanaka', 'Sato', 'Martin', 'Dubois', 'Bernard', 'Rossi', 'Fischer', 'Santos', 'Silva'];
    return `${first} ${pick(lastNames, idx)}`;
  }
  return vnName(idx);
}

// ---------------------------------------------------------------------------
// Location pools
// ---------------------------------------------------------------------------

interface SeedLocation {
  country: string;
  state: string | null;
  city: string;
  lat: number;
  lng: number;
}

const hcmLocations: SeedLocation[] = [
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'District 1', lat: 10.7769, lng: 106.7009 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'District 3', lat: 10.7834, lng: 106.6868 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'District 7', lat: 10.7346, lng: 106.7218 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'Thu Duc', lat: 10.8511, lng: 106.7719 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'Binh Thanh', lat: 10.8015, lng: 106.7094 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'Phu Nhuan', lat: 10.7991, lng: 106.6802 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'Tan Binh', lat: 10.8014, lng: 106.6529 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'Go Vap', lat: 10.8385, lng: 106.6544 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'District 5', lat: 10.7544, lng: 106.6637 },
  { country: 'Vietnam', state: 'Ho Chi Minh City', city: 'District 10', lat: 10.7726, lng: 106.6668 },
];

const hanoiLocations: SeedLocation[] = [
  { country: 'Vietnam', state: 'Hanoi', city: 'Hoan Kiem', lat: 21.0285, lng: 105.8542 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Ba Dinh', lat: 21.0358, lng: 105.8194 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Dong Da', lat: 21.0167, lng: 105.8323 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Cau Giay', lat: 21.0318, lng: 105.7912 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Hai Ba Trung', lat: 21.0089, lng: 105.8616 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Thanh Xuan', lat: 20.9933, lng: 105.8113 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Long Bien', lat: 21.0469, lng: 105.8898 },
  { country: 'Vietnam', state: 'Hanoi', city: 'Nam Tu Liem', lat: 21.0194, lng: 105.7649 },
];

const vnOtherLocations: SeedLocation[] = [
  { country: 'Vietnam', state: 'Da Nang', city: 'Hai Chau', lat: 16.0544, lng: 108.2022 },
  { country: 'Vietnam', state: 'Da Nang', city: 'Son Tra', lat: 16.0878, lng: 108.2386 },
  { country: 'Vietnam', state: 'Da Nang', city: 'Thanh Khe', lat: 16.0622, lng: 108.1819 },
  { country: 'Vietnam', state: 'Can Tho', city: 'Ninh Kieu', lat: 10.0341, lng: 105.7716 },
  { country: 'Vietnam', state: 'Thua Thien Hue', city: 'Hue', lat: 16.4637, lng: 107.5909 },
  { country: 'Vietnam', state: 'Khanh Hoa', city: 'Nha Trang', lat: 12.2388, lng: 109.1967 },
  { country: 'Vietnam', state: 'Hai Phong', city: 'Hong Bang', lat: 20.8559, lng: 106.6826 },
  { country: 'Vietnam', state: 'Ba Ria Vung Tau', city: 'Vung Tau', lat: 10.3460, lng: 107.0843 },
  { country: 'Vietnam', state: 'Lam Dong', city: 'Da Lat', lat: 11.9404, lng: 108.4583 },
  { country: 'Vietnam', state: 'Binh Duong', city: 'Thu Dau Mot', lat: 11.0047, lng: 106.6520 },
  { country: 'Vietnam', state: 'Dong Nai', city: 'Bien Hoa', lat: 10.9475, lng: 106.8243 },
  { country: 'Vietnam', state: 'Quang Ninh', city: 'Ha Long', lat: 20.9516, lng: 107.0809 },
  { country: 'Vietnam', state: 'Nghe An', city: 'Vinh', lat: 18.6796, lng: 105.6813 },
  { country: 'Vietnam', state: 'Binh Thuan', city: 'Phan Thiet', lat: 10.9289, lng: 108.1002 },
  { country: 'Vietnam', state: 'Quang Nam', city: 'Hoi An', lat: 15.8801, lng: 108.3380 },
];

const usaLocations: SeedLocation[] = [
  // NYC (12)
  { country: 'United States', state: 'New York', city: 'New York', lat: 40.7128, lng: -74.0060 },
  { country: 'United States', state: 'New York', city: 'Brooklyn', lat: 40.6782, lng: -73.9442 },
  { country: 'United States', state: 'New York', city: 'Queens', lat: 40.7282, lng: -73.7949 },
  // SF Bay Area (10)
  { country: 'United States', state: 'California', city: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { country: 'United States', state: 'California', city: 'San Jose', lat: 37.3382, lng: -121.8863 },
  { country: 'United States', state: 'California', city: 'Palo Alto', lat: 37.4419, lng: -122.1430 },
  { country: 'United States', state: 'California', city: 'Mountain View', lat: 37.3861, lng: -122.0839 },
  // LA (8)
  { country: 'United States', state: 'California', city: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { country: 'United States', state: 'California', city: 'Irvine', lat: 33.6846, lng: -117.8265 },
  // Chicago (5)
  { country: 'United States', state: 'Illinois', city: 'Chicago', lat: 41.8781, lng: -87.6298 },
  // Boston (5)
  { country: 'United States', state: 'Massachusetts', city: 'Boston', lat: 42.3601, lng: -71.0589 },
  { country: 'United States', state: 'Massachusetts', city: 'Cambridge', lat: 42.3736, lng: -71.1097 },
  // Other cities
  { country: 'United States', state: 'Washington', city: 'Seattle', lat: 47.6062, lng: -122.3321 },
  { country: 'United States', state: 'Texas', city: 'Austin', lat: 30.2672, lng: -97.7431 },
  { country: 'United States', state: 'Texas', city: 'Houston', lat: 29.7604, lng: -95.3698 },
  { country: 'United States', state: 'District of Columbia', city: 'Washington', lat: 38.9072, lng: -77.0369 },
  { country: 'United States', state: 'Florida', city: 'Miami', lat: 25.7617, lng: -80.1918 },
  { country: 'United States', state: 'Georgia', city: 'Atlanta', lat: 33.7490, lng: -84.3880 },
  { country: 'United States', state: 'Pennsylvania', city: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
  { country: 'United States', state: 'Colorado', city: 'Denver', lat: 39.7392, lng: -104.9903 },
];

const g7g20Locations: SeedLocation[] = [
  // Japan (8)
  { country: 'Japan', state: 'Tokyo', city: 'Shibuya', lat: 35.6619, lng: 139.7041 },
  { country: 'Japan', state: 'Tokyo', city: 'Shinjuku', lat: 35.6938, lng: 139.7036 },
  { country: 'Japan', state: 'Tokyo', city: 'Minato', lat: 35.6581, lng: 139.7514 },
  { country: 'Japan', state: 'Osaka', city: 'Osaka', lat: 34.6937, lng: 135.5023 },
  { country: 'Japan', state: 'Aichi', city: 'Nagoya', lat: 35.1815, lng: 136.9066 },
  // UK (8)
  { country: 'United Kingdom', state: 'England', city: 'London', lat: 51.5074, lng: -0.1278 },
  { country: 'United Kingdom', state: 'England', city: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { country: 'United Kingdom', state: 'England', city: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { country: 'United Kingdom', state: 'Scotland', city: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  // France (6)
  { country: 'France', state: 'Ile-de-France', city: 'Paris', lat: 48.8566, lng: 2.3522 },
  { country: 'France', state: 'Auvergne-Rhone-Alpes', city: 'Lyon', lat: 45.7640, lng: 4.8357 },
  { country: 'France', state: 'Provence-Alpes-Cote dAzur', city: 'Marseille', lat: 43.2965, lng: 5.3698 },
  // Germany (6)
  { country: 'Germany', state: 'Berlin', city: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { country: 'Germany', state: 'Bavaria', city: 'Munich', lat: 48.1351, lng: 11.5820 },
  { country: 'Germany', state: 'Hesse', city: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
  // Canada (5)
  { country: 'Canada', state: 'Ontario', city: 'Toronto', lat: 43.6532, lng: -79.3832 },
  { country: 'Canada', state: 'British Columbia', city: 'Vancouver', lat: 49.2827, lng: -123.1207 },
  { country: 'Canada', state: 'Quebec', city: 'Montreal', lat: 45.5017, lng: -73.5673 },
  // Australia (5)
  { country: 'Australia', state: 'New South Wales', city: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { country: 'Australia', state: 'Victoria', city: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { country: 'Australia', state: 'Queensland', city: 'Brisbane', lat: -27.4698, lng: 153.0251 },
  // South Korea (4)
  { country: 'South Korea', state: 'Seoul', city: 'Seoul', lat: 37.5665, lng: 126.9780 },
  { country: 'South Korea', state: 'Gyeonggi', city: 'Suwon', lat: 37.2636, lng: 127.0286 },
  // Singapore (4)
  { country: 'Singapore', state: null, city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  // Others (4)
  { country: 'Italy', state: 'Lazio', city: 'Rome', lat: 41.9028, lng: 12.4964 },
  { country: 'Netherlands', state: 'North Holland', city: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { country: 'Sweden', state: 'Stockholm', city: 'Stockholm', lat: 59.3293, lng: 18.0686 },
  { country: 'Switzerland', state: 'Zurich', city: 'Zurich', lat: 47.3769, lng: 8.5417 },
];

const restOfWorldLocations: SeedLocation[] = [
  { country: 'India', state: 'Maharashtra', city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { country: 'India', state: 'Karnataka', city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { country: 'India', state: 'Delhi', city: 'New Delhi', lat: 28.6139, lng: 77.2090 },
  { country: 'Brazil', state: 'Sao Paulo', city: 'Sao Paulo', lat: -23.5505, lng: -46.6333 },
  { country: 'Brazil', state: 'Rio de Janeiro', city: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
  { country: 'Mexico', state: 'Mexico City', city: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  { country: 'Mexico', state: 'Jalisco', city: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
  { country: 'Thailand', state: 'Bangkok', city: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { country: 'Philippines', state: 'Metro Manila', city: 'Manila', lat: 14.5995, lng: 120.9842 },
  { country: 'Philippines', state: 'Cebu', city: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { country: 'Indonesia', state: 'Jakarta', city: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { country: 'Indonesia', state: 'Bali', city: 'Denpasar', lat: -8.6705, lng: 115.2126 },
  { country: 'United Arab Emirates', state: 'Dubai', city: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { country: 'United Arab Emirates', state: 'Abu Dhabi', city: 'Abu Dhabi', lat: 24.4539, lng: 54.3773 },
  { country: 'South Africa', state: 'Western Cape', city: 'Cape Town', lat: -33.9249, lng: 18.4241 },
  { country: 'South Africa', state: 'Gauteng', city: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { country: 'Nigeria', state: 'Lagos', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { country: 'Kenya', state: 'Nairobi', city: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { country: 'Egypt', state: 'Cairo', city: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { country: 'Colombia', state: 'Bogota', city: 'Bogota', lat: 4.7110, lng: -74.0721 },
  { country: 'Argentina', state: 'Buenos Aires', city: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { country: 'Chile', state: 'Santiago', city: 'Santiago', lat: -33.4489, lng: -70.6693 },
  { country: 'Malaysia', state: 'Kuala Lumpur', city: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869 },
  { country: 'Taiwan', state: 'Taipei', city: 'Taipei', lat: 25.0330, lng: 121.5654 },
  { country: 'Israel', state: 'Tel Aviv', city: 'Tel Aviv', lat: 32.0853, lng: 34.7818 },
  { country: 'Poland', state: 'Masovia', city: 'Warsaw', lat: 52.2297, lng: 21.0122 },
  { country: 'Czech Republic', state: 'Prague', city: 'Prague', lat: 50.0755, lng: 14.4378 },
  { country: 'Turkey', state: 'Istanbul', city: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { country: 'Saudi Arabia', state: 'Riyadh', city: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { country: 'New Zealand', state: 'Auckland', city: 'Auckland', lat: -36.8485, lng: 174.7633 },
  { country: 'Peru', state: 'Lima', city: 'Lima', lat: -12.0464, lng: -77.0428 },
  { country: 'Morocco', state: 'Casablanca-Settat', city: 'Casablanca', lat: 33.5731, lng: -7.5898 },
  { country: 'Ghana', state: 'Greater Accra', city: 'Accra', lat: 5.6037, lng: -0.1870 },
  { country: 'Cambodia', state: 'Phnom Penh', city: 'Phnom Penh', lat: 11.5564, lng: 104.9282 },
  { country: 'Myanmar', state: 'Yangon', city: 'Yangon', lat: 16.8661, lng: 96.1951 },
];

const hungaryLocations: SeedLocation[] = [
  { country: 'Hungary', state: 'Budapest', city: 'Budapest', lat: 47.4979, lng: 19.0402 },
  { country: 'Hungary', state: 'Pest', city: 'Budaors', lat: 47.4621, lng: 18.9584 },
  { country: 'Hungary', state: 'Hajdu-Bihar', city: 'Debrecen', lat: 47.5316, lng: 21.6273 },
  { country: 'Hungary', state: 'Borsod-Abauj-Zemplen', city: 'Miskolc', lat: 48.1035, lng: 20.7784 },
  { country: 'Hungary', state: 'Csongrad-Csanad', city: 'Szeged', lat: 46.2530, lng: 20.1414 },
  { country: 'Hungary', state: 'Gyor-Moson-Sopron', city: 'Gyor', lat: 47.6875, lng: 17.6504 },
  { country: 'Hungary', state: 'Baranya', city: 'Pecs', lat: 46.0727, lng: 18.2323 },
  { country: 'Hungary', state: 'Veszprem', city: 'Veszprem', lat: 47.0933, lng: 17.9115 },
];

const russiaLocations: SeedLocation[] = [
  { country: 'Russia', state: 'Moscow', city: 'Moscow', lat: 55.7558, lng: 37.6173 },
  { country: 'Russia', state: 'Moscow Oblast', city: 'Podolsk', lat: 55.4312, lng: 37.5447 },
  { country: 'Russia', state: 'Saint Petersburg', city: 'Saint Petersburg', lat: 59.9343, lng: 30.3351 },
  { country: 'Russia', state: 'Novosibirsk Oblast', city: 'Novosibirsk', lat: 55.0084, lng: 82.9357 },
  { country: 'Russia', state: 'Sverdlovsk Oblast', city: 'Yekaterinburg', lat: 56.8389, lng: 60.6057 },
  { country: 'Russia', state: 'Tatarstan', city: 'Kazan', lat: 55.7963, lng: 49.1088 },
  { country: 'Russia', state: 'Nizhny Novgorod Oblast', city: 'Nizhny Novgorod', lat: 56.2965, lng: 43.9361 },
  { country: 'Russia', state: 'Krasnodar Krai', city: 'Krasnodar', lat: 45.0355, lng: 38.9753 },
  { country: 'Russia', state: 'Samara Oblast', city: 'Samara', lat: 53.1959, lng: 50.1002 },
  { country: 'Russia', state: 'Rostov Oblast', city: 'Rostov-on-Don', lat: 47.2357, lng: 39.7015 },
];

const romaniaBulgariaLocations: SeedLocation[] = [
  { country: 'Romania', state: 'Bucharest', city: 'Bucharest', lat: 44.4268, lng: 26.1025 },
  { country: 'Romania', state: 'Cluj', city: 'Cluj-Napoca', lat: 46.7712, lng: 23.6236 },
  { country: 'Romania', state: 'Timis', city: 'Timisoara', lat: 45.7489, lng: 21.2087 },
  { country: 'Romania', state: 'Iasi', city: 'Iasi', lat: 47.1585, lng: 27.6014 },
  { country: 'Romania', state: 'Constanta', city: 'Constanta', lat: 44.1598, lng: 28.6348 },
  { country: 'Bulgaria', state: 'Sofia City', city: 'Sofia', lat: 42.6977, lng: 23.3219 },
  { country: 'Bulgaria', state: 'Plovdiv', city: 'Plovdiv', lat: 42.1354, lng: 24.7453 },
  { country: 'Bulgaria', state: 'Varna', city: 'Varna', lat: 43.2141, lng: 27.9147 },
  { country: 'Bulgaria', state: 'Burgas', city: 'Burgas', lat: 42.5048, lng: 27.4626 },
  { country: 'Bulgaria', state: 'Ruse', city: 'Ruse', lat: 43.8486, lng: 25.9536 },
];

const spainPortugalLocations: SeedLocation[] = [
  { country: 'Spain', state: 'Madrid', city: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { country: 'Spain', state: 'Catalonia', city: 'Barcelona', lat: 41.3874, lng: 2.1686 },
  { country: 'Spain', state: 'Andalusia', city: 'Seville', lat: 37.3891, lng: -5.9845 },
  { country: 'Spain', state: 'Valencia', city: 'Valencia', lat: 39.4699, lng: -0.3763 },
  { country: 'Portugal', state: 'Lisbon', city: 'Lisbon', lat: 38.7223, lng: -9.1393 },
  { country: 'Portugal', state: 'Porto', city: 'Porto', lat: 41.1579, lng: -8.6291 },
  { country: 'Portugal', state: 'Faro', city: 'Faro', lat: 37.0194, lng: -7.9304 },
];

// ---------------------------------------------------------------------------
// Industry / Specialization / Job pools
// ---------------------------------------------------------------------------

interface IndustrySpec {
  industry: string; // slug
  specialization: string; // slug
  titles: string[];
  companies: string[];
}

const industryPool: IndustrySpec[] = [
  {
    industry: 'technology', specialization: 'software-engineering',
    titles: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager', 'Tech Lead', 'Backend Developer', 'Frontend Developer', 'Full-Stack Developer'],
    companies: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Shopee', 'Grab', 'VNG Corporation', 'FPT Software', 'Tiki', 'MoMo', 'VNPAY', 'Stripe', 'Datadog', 'Cloudflare'],
  },
  {
    industry: 'technology', specialization: 'data-science-ai-ml',
    titles: ['Data Scientist', 'ML Engineer', 'AI Researcher', 'Data Analyst', 'Research Scientist'],
    companies: ['OpenAI', 'DeepMind', 'Google', 'Meta AI', 'VinAI', 'Cinnamon AI', 'NVIDIA', 'Databricks'],
  },
  {
    industry: 'technology', specialization: 'product-management',
    titles: ['Product Manager', 'Senior PM', 'Director of Product', 'Product Lead', 'Group PM'],
    companies: ['Google', 'Meta', 'Shopee', 'Grab', 'Atlassian', 'Stripe', 'Notion'],
  },
  {
    industry: 'finance-banking', specialization: 'investment-banking',
    titles: ['Analyst', 'Associate', 'Vice President', 'Director', 'Managing Director'],
    companies: ['Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Citadel', 'DBS Bank', 'HSBC', 'Techcombank', 'VPBank'],
  },
  {
    industry: 'finance-banking', specialization: 'venture-capital',
    titles: ['Investment Analyst', 'Associate', 'Principal', 'Partner'],
    companies: ['VinaCapital Ventures', 'Sequoia Capital', 'a16z', 'Vertex Ventures', 'Do Ventures', '500 Global'],
  },
  {
    industry: 'finance-banking', specialization: 'fintech',
    titles: ['Fintech Engineer', 'Product Manager', 'Growth Lead', 'Head of Engineering'],
    companies: ['MoMo', 'VNPAY', 'Toss', 'Revolut', 'Wise', 'Stripe'],
  },
  {
    industry: 'healthcare-medicine', specialization: 'clinical-medicine',
    titles: ['Physician', 'Resident', 'Attending Physician', 'Surgeon', 'Specialist'],
    companies: ['UCSF Medical Center', 'Mayo Clinic', 'FV Hospital', 'Cho Ray Hospital', 'Vinmec', 'Johns Hopkins'],
  },
  {
    industry: 'healthcare-medicine', specialization: 'pharmaceuticals',
    titles: ['Pharmacist', 'Clinical Research Associate', 'Drug Safety Specialist', 'Regulatory Affairs Manager'],
    companies: ['Pfizer', 'Roche', 'Novartis', 'Sanofi', 'AstraZeneca', 'Danapha'],
  },
  {
    industry: 'education', specialization: 'higher-education',
    titles: ['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor', 'Postdoc'],
    companies: ['VNU-HCM', 'Hanoi University of Science', 'MIT', 'Stanford', 'NUS', 'University of Tokyo', 'RMIT Vietnam'],
  },
  {
    industry: 'education', specialization: 'edtech',
    titles: ['EdTech Product Manager', 'Curriculum Designer', 'Learning Engineer', 'Head of Content'],
    companies: ['Coursera', 'Duolingo', 'ELSA', 'Topica', 'MindX', 'CoderSchool'],
  },
  {
    industry: 'engineering', specialization: 'civil-engineering',
    titles: ['Structural Engineer', 'Project Engineer', 'Construction Manager', 'Site Engineer'],
    companies: ['Arup', 'AECOM', 'Bechtel', 'Coteccons', 'Hoa Binh Construction'],
  },
  {
    industry: 'engineering', specialization: 'mechanical-engineering',
    titles: ['Mechanical Engineer', 'Design Engineer', 'Manufacturing Engineer', 'R&D Engineer'],
    companies: ['Toyota', 'Bosch', 'Siemens', 'Samsung Engineering', 'Vinfast'],
  },
  {
    industry: 'consulting', specialization: 'management-consulting',
    titles: ['Consultant', 'Senior Consultant', 'Manager', 'Principal', 'Partner'],
    companies: ['McKinsey', 'BCG', 'Bain', 'Deloitte', 'PwC', 'EY', 'KPMG', 'Accenture'],
  },
  {
    industry: 'consulting', specialization: 'strategy-consulting',
    titles: ['Strategy Analyst', 'Strategy Consultant', 'Senior Associate', 'Engagement Manager'],
    companies: ['McKinsey', 'BCG', 'Bain', 'Roland Berger', 'LEK Consulting'],
  },
  {
    industry: 'law', specialization: 'corporate-law',
    titles: ['Associate', 'Senior Associate', 'Counsel', 'Partner', 'Legal Advisor'],
    companies: ['Baker McKenzie', 'Freshfields', 'VILAF', 'Rajah & Tann', 'Allen & Gledhill'],
  },
  {
    industry: 'media-communications', specialization: 'marketing',
    titles: ['Marketing Manager', 'Brand Strategist', 'CMO', 'Growth Marketing Lead', 'Digital Marketing Manager'],
    companies: ['Unilever', 'P&G', 'Ogilvy', 'Dentsu', 'VinGroup', 'Lazada'],
  },
  {
    industry: 'arts-entertainment', specialization: 'visual-arts',
    titles: ['Art Director', 'Creative Director', 'Graphic Designer', 'Illustrator', 'UX Designer'],
    companies: ['Self-Employed', 'IDEO', 'Pentagram', 'Rice Creative', 'Studio Nao'],
  },
  {
    industry: 'research-academia', specialization: 'natural-sciences',
    titles: ['Research Scientist', 'Postdoctoral Fellow', 'Lab Director', 'Research Associate'],
    companies: ['CERN', 'NASA', 'CNRS', 'Max Planck Institute', 'Vietnam Academy of Science'],
  },
  {
    industry: 'energy-environment', specialization: 'renewable-energy',
    titles: ['Renewable Energy Engineer', 'Sustainability Analyst', 'Project Developer', 'Energy Consultant'],
    companies: ['Vestas', 'Siemens Gamesa', 'NextEra Energy', 'EVN', 'TotalEnergies'],
  },
  {
    industry: 'retail-ecommerce', specialization: 'ecommerce',
    titles: ['E-commerce Manager', 'Category Manager', 'Operations Lead', 'Marketplace Analyst'],
    companies: ['Shopee', 'Lazada', 'Tiki', 'Amazon', 'Tokopedia', 'Alibaba'],
  },
  {
    industry: 'government-public-policy', specialization: 'public-administration',
    titles: ['Policy Analyst', 'Government Advisor', 'Program Director', 'Civil Servant'],
    companies: ['World Bank', 'UNDP', 'Ministry of Finance', 'Ministry of Planning', 'ADB'],
  },
  {
    industry: 'non-profit', specialization: 'community-development',
    titles: ['Program Manager', 'Community Organizer', 'Development Officer', 'Project Coordinator'],
    companies: ['UNICEF', 'Save the Children', 'Teach For Vietnam', 'Room to Read', 'VNGO'],
  },
  {
    industry: 'hospitality-tourism', specialization: 'hotel-management',
    titles: ['Hotel Manager', 'Revenue Manager', 'Guest Experience Director', 'F&B Manager'],
    companies: ['Marriott', 'Hyatt', 'Accor', 'Vinpearl', 'Melia Hotels'],
  },
  {
    industry: 'technology', specialization: 'cybersecurity',
    titles: ['Security Engineer', 'Cybersecurity Analyst', 'Penetration Tester', 'CISO'],
    companies: ['CrowdStrike', 'Palo Alto Networks', 'CyberCX', 'Viettel Cyber Security'],
  },
  {
    industry: 'manufacturing', specialization: 'automation-robotics',
    titles: ['Automation Engineer', 'Robotics Engineer', 'Controls Engineer', 'Systems Integrator'],
    companies: ['ABB', 'Fanuc', 'KUKA', 'Samsung Electronics', 'Vinfast'],
  },
];

const bios = [
  'Passionate about building impactful products and mentoring the next generation.',
  'Lifelong learner with a love for technology and innovation.',
  'Working at the intersection of business and technology.',
  'Dedicated to making a difference through data-driven decisions.',
  'Enjoying the journey of continuous growth and learning.',
  'Committed to excellence and pushing boundaries every day.',
  'Love connecting with fellow PTNK alumni around the world.',
  'Building the future, one project at a time.',
  'Focused on creating value through collaboration and hard work.',
  'Driven by curiosity and a passion for problem-solving.',
  'Proud PTNK alum making waves in my industry.',
  'Combining Vietnamese roots with global perspectives.',
  'Always open to new opportunities and meaningful connections.',
  'Thriving in fast-paced environments and complex challenges.',
  'Bridging cultures and ideas across borders.',
  'Passionate about sustainable development and social impact.',
  'Embracing challenges and turning them into opportunities.',
  'Grateful for the PTNK foundation that shaped my career.',
  'Helping organizations scale through innovative solutions.',
  'Exploring new frontiers in my field every day.',
];

const availabilityTags = [
  'open-to-mentoring',
  'open-to-coffee-chats',
  'open-to-collaboration',
  'looking-for-work',
  'hiring',
  'not-currently-available',
];

// ---------------------------------------------------------------------------
// Build user data
// ---------------------------------------------------------------------------

interface User {
  idx: number; // 0 = admin, 1-249 = test users
  name: string;
  loc: SeedLocation;
  industry: IndustrySpec;
  gradYear: number;
  bio: string;
  jobTitle: string;
  company: string;
}

const users: User[] = [];

// Admin
users.push({
  idx: 0,
  name: 'Son Ha',
  loc: { country: 'United States', state: 'New York', city: 'New York', lat: 40.7128, lng: -74.0060 },
  industry: industryPool[0], // technology / software engineering
  gradYear: 2021,
  bio: 'Platform admin. PTNK alum building tools for our community.',
  jobTitle: 'Software Engineer',
  company: 'Citadel',
});

// --- Vietnam: 100 users (idx 1–100) ---
// HCM: 40 (idx 1-40)
for (let i = 1; i <= 40; i++) {
  const loc = pick(hcmLocations, i);
  const ind = pick(industryPool, i);
  users.push({
    idx: i,
    name: vnName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.02, i), lng: jitter(loc.lng, 0.02, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}
// Hanoi: 30 (idx 41-70)
for (let i = 41; i <= 70; i++) {
  const loc = pick(hanoiLocations, i);
  const ind = pick(industryPool, i + 3);
  users.push({
    idx: i,
    name: vnName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.02, i), lng: jitter(loc.lng, 0.02, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 2),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}
// Da Nang + other VN: 30 (idx 71-100)
for (let i = 71; i <= 100; i++) {
  const loc = pick(vnOtherLocations, i);
  const ind = pick(industryPool, i + 7);
  users.push({
    idx: i,
    name: vnName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 4),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- USA: 50 users (idx 101–150) ---
for (let i = 101; i <= 150; i++) {
  const loc = pick(usaLocations, i);
  const ind = pick(industryPool, i + 2);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 1),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- G7/G20/OECD: 50 users (idx 151–200) ---
for (let i = 151; i <= 200; i++) {
  const loc = pick(g7g20Locations, i);
  const ind = pick(industryPool, i + 5);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 3),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- Rest of world: 49 users (idx 201–249) ---
for (let i = 201; i <= 249; i++) {
  const loc = pick(restOfWorldLocations, i);
  const ind = pick(industryPool, i + 9);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.04, i), lng: jitter(loc.lng, 0.04, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 6),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- Hungary: 15 users (idx 250–264) ---
for (let i = 250; i <= 264; i++) {
  const loc = pick(hungaryLocations, i);
  const ind = pick(industryPool, i + 4);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 2),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- Russia: 20 users (idx 265–284) ---
for (let i = 265; i <= 284; i++) {
  const loc = pick(russiaLocations, i);
  const ind = pick(industryPool, i + 6);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.04, i), lng: jitter(loc.lng, 0.04, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 3),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- Romania & Bulgaria: 10 users (idx 285–294) ---
for (let i = 285; i <= 294; i++) {
  const loc = pick(romaniaBulgariaLocations, i);
  const ind = pick(industryPool, i + 8);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 5),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// --- Spain & Portugal: 5 users (idx 295–299) ---
for (let i = 295; i <= 299; i++) {
  const loc = pick(spainPortugalLocations, i);
  const ind = pick(industryPool, i + 10);
  users.push({
    idx: i,
    name: intlName(i),
    loc: { ...loc, lat: jitter(loc.lat, 0.03, i), lng: jitter(loc.lng, 0.03, i) },
    industry: ind,
    gradYear: 2005 + (i % 20),
    bio: pick(bios, i + 7),
    jobTitle: pick(ind.titles, i),
    company: pick(ind.companies, i),
  });
}

// ---------------------------------------------------------------------------
// Generate SQL
// ---------------------------------------------------------------------------

const BCRYPT_HASH = '$2a$10$r9dScvB2HRNya9SsmtVhYe.o.m9ulfl56.gPx2m48JjiFqMoSIqsW';
const SCHOOL_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const INSTANCE_ID = '00000000-0000-0000-0000-000000000000';

const lines: string[] = [];
const w = (s: string) => lines.push(s);

w('-- =============================================================================');
w('-- Seed data for manual testing — 300 users for alumni world map');
w('-- Admin: admin@gmail.com | Test users: test1@gmail.com ... test299@gmail.com');
w('-- All passwords: 24092003');
w('-- =============================================================================');
w('');

// --- 1. auth.users ---
w('-- =============================================================================');
w('-- 1. Insert auth.users (triggers auto-creation of public.users)');
w('-- =============================================================================');
w('');
w(`INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new,
  email_change, phone_change, phone_change_token,
  email_change_token_current, reauthentication_token,
  is_super_admin, is_sso_user, is_anonymous
) VALUES`);

for (let i = 0; i < users.length; i++) {
  const u = users[i];
  const uid = userId(u.idx);
  const em = email(u.idx);
  const comma = i < users.length - 1 ? ',' : '';
  const label = u.idx === 0 ? '-- Admin' : `-- test${u.idx}`;
  w(`  ${label}: ${esc(u.name)}`);
  w(`  ('${uid}', '${INSTANCE_ID}', 'authenticated', 'authenticated',`);
  w(`   '${em}',`);
  w(`   '${BCRYPT_HASH}',`);
  w(`   now(), now(), now(),`);
  w(`   '{"provider":"email","providers":["email"]}', '{}',`);
  w(`   '', '', '', '', '', '', '', '',`);
  w(`   false, false, false)${comma}`);
  w('');
}
w('ON CONFLICT (id) DO NOTHING;');
w('');

// --- 2. auth.identities ---
w('-- =============================================================================');
w('-- 2. Insert auth.identities');
w('-- =============================================================================');
w('');
w(`INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES`);

for (let i = 0; i < users.length; i++) {
  const u = users[i];
  const uid = userId(u.idx);
  const em = email(u.idx);
  const comma = i < users.length - 1 ? ',' : '';
  w(`  ('${uid}', '${uid}', '${uid}', '{"sub":"${uid}","email":"${esc(em)}"}', 'email', now(), now(), now())${comma}`);
}
w('ON CONFLICT DO NOTHING;');
w('');

// --- 3. Set roles + verification ---
w('-- =============================================================================');
w('-- 3. Set admin role + mark all users as verified');
w('-- =============================================================================');
w('');
w(`UPDATE public.users SET role = 'admin' WHERE id = '${userId(0)}';`);
w('');
w(`UPDATE public.users SET verification_status = 'verified';`);
w('');

// --- 4. Profiles ---
w('-- =============================================================================');
w('-- 4. Create profiles with geocoded coordinates');
w('-- =============================================================================');
w('');
w(`INSERT INTO public.profiles (
  id, user_id, full_name, bio, graduation_year,
  primary_industry_id, primary_specialization_id,
  country, state_province, city, school_id,
  latitude, longitude, location_geocoded_at,
  profile_completeness, last_active_at
) VALUES`);

for (let i = 0; i < users.length; i++) {
  const u = users[i];
  const pid = profileId(u.idx);
  const uid = userId(u.idx);
  const comma = i < users.length - 1 ? ',' : '';
  const state = u.loc.state ? `'${esc(u.loc.state)}'` : 'NULL';
  const hoursAgo = (u.idx * 7) % 720; // spread last_active across 30 days
  w(`  -- ${u.idx === 0 ? 'Admin' : `test${u.idx}`}: ${esc(u.name)} — ${u.loc.city}, ${u.loc.country}`);
  w(`  ('${pid}', '${uid}', '${esc(u.name)}',`);
  w(`   '${esc(u.bio)}', ${u.gradYear},`);
  w(`   (SELECT id FROM industries WHERE slug = '${u.industry.industry}'),`);
  w(`   (SELECT id FROM specializations WHERE slug = '${u.industry.specialization}'),`);
  w(`   '${esc(u.loc.country)}', ${state}, '${esc(u.loc.city)}',`);
  w(`   '${SCHOOL_ID}',`);
  w(`   ${u.loc.lat}, ${u.loc.lng}, now(),`);
  w(`   ${60 + (u.idx % 35)}, now() - interval '${hoursAgo} hours')${comma}`);
  w('');
}
w('ON CONFLICT (user_id) DO NOTHING;');
w('');

// --- 5. Career entries ---
w('-- =============================================================================');
w('-- 5. Create career entries (current jobs)');
w('-- =============================================================================');
w('');
w(`INSERT INTO public.career_entries (
  profile_id, job_title, company, industry_id, specialization_id,
  start_date, is_current, sort_order
) VALUES`);

for (let i = 0; i < users.length; i++) {
  const u = users[i];
  const pid = profileId(u.idx);
  const comma = i < users.length - 1 ? ',' : '';
  const startYear = Math.max(u.gradYear + 3, 2018);
  const startMonth = String(1 + (u.idx % 12)).padStart(2, '0');
  w(`  ('${pid}', '${esc(u.jobTitle)}', '${esc(u.company)}',`);
  w(`   (SELECT id FROM industries WHERE slug = '${u.industry.industry}'),`);
  w(`   (SELECT id FROM specializations WHERE slug = '${u.industry.specialization}'),`);
  w(`   '${startYear}-${startMonth}-01', true, 0)${comma}`);
}
w(';');
w('');

// --- 6. Availability tags ---
w('-- =============================================================================');
w('-- 6. Add availability tags');
w('-- =============================================================================');
w('');
w(`INSERT INTO public.user_availability_tags (profile_id, tag_type_id)
SELECT p.profile_id::uuid, t.id
FROM (VALUES`);

const tagLines: string[] = [];
for (const u of users) {
  const pid = profileId(u.idx);
  // Give each user 1-2 tags based on their index
  const tag1 = pick(availabilityTags, u.idx);
  tagLines.push(`  ('${pid}', '${tag1}')`);
  if (u.idx % 3 !== 0) {
    const tag2 = pick(availabilityTags, u.idx + 3);
    if (tag2 !== tag1) {
      tagLines.push(`  ('${pid}', '${tag2}')`);
    }
  }
}
w(tagLines.join(',\n'));
w(`) AS p(profile_id, tag_slug)
JOIN public.availability_tag_types t ON t.slug = p.tag_slug
ON CONFLICT DO NOTHING;`);

// Output
console.log(lines.join('\n'));
