// Role → HD worker image mapping for BrowseWorkers and matches
// Each role gets a relevant Unsplash image. profilePhoto (if ever set) takes priority.

const ROLE_IMAGES = {
  'Plumber': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=200&h=200&fit=crop&crop=faces',
  'Electrician': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&h=200&fit=crop&crop=faces',
  'Mason': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&h=200&fit=crop&crop=faces',
  'Carpenter': 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=200&h=200&fit=crop&crop=faces',
  'Painter': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&h=200&fit=crop&crop=faces',
  'Welder': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=200&h=200&fit=crop&crop=faces',
  'Cleaner': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop&crop=faces',
  'Cleaner Deep Cleaning': 'https://images.unsplash.com/photo-1610902900778-d03c6f0e1780?w=200&h=200&fit=crop&crop=faces',
  'Cook': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200&h=200&fit=crop&crop=faces',
  'Baker': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop&crop=faces',
  'Driver': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop&crop=faces',
  'Delivery Boy': 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=200&h=200&fit=crop&crop=faces',
  'Tailor': 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=200&h=200&fit=crop&crop=faces',
  'Gardener': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&crop=faces',
  'Mechanic': 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=200&h=200&fit=crop&crop=faces',
  'Security Guard': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'Barber': 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&h=200&fit=crop&crop=faces',
  'Beautician': 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=200&h=200&fit=crop&crop=faces',
  'Construction Worker': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&h=200&fit=crop&crop=faces',
  'Machine Operator': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&h=200&fit=crop&crop=faces',
  'Locksmith': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=200&h=200&fit=crop&crop=faces',
  'Roofer': 'https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=200&h=200&fit=crop&crop=faces',
  'Tile Layer': 'https://images.unsplash.com/photo-1613553503859-8a5d5e0baf74?w=200&h=200&fit=crop&crop=faces',
  'Plasterer': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop&crop=faces',
  'Fitness Trainer': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=faces',
  'Teacher': 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=200&h=200&fit=crop&crop=faces',
  'Nurse Attendant': 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=200&h=200&fit=crop&crop=faces',
  'Hotel Staff': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop&crop=faces',
  'App Developer': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=200&h=200&fit=crop&crop=faces',
  'Data Entry Operator': 'https://images.unsplash.com/photo-1520327495814-0ac778c06be6?w=200&h=200&fit=crop&crop=faces',
  'Farm Helper': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&h=200&fit=crop&crop=faces',
  'Cobbler': 'https://unsplash.com/photos/a-cobbler-examines-a-shoe-in-his-workshop-5HtqKvgmyno',
  'Massage Therapist': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop&crop=faces',
  'Travel Guide': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop&crop=faces',
  'AC Technician': 'https://images.unsplash.com/photo-1631545805700-0edfa8b8b5f1?w=200&h=200&fit=crop&crop=faces',
  'CCTV Technician': 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&h=200&fit=crop&crop=faces',
};

const DEFAULT_ROLE_IMAGE = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces';

// Pick the best role image: exact role name → keyword fuzzy match → default
export const getRoleImage = (roleName) => {
  if (!roleName) return DEFAULT_ROLE_IMAGE;
  const key = Object.keys(ROLE_IMAGES).find(
    k => k.toLowerCase() === roleName.toLowerCase()
  );
  const fuzzy = Object.keys(ROLE_IMAGES).find(
    k => roleName.toLowerCase().includes(k.toLowerCase().split(' ')[0])
  );
  return ROLE_IMAGES[key || fuzzy] || DEFAULT_ROLE_IMAGE;
};

// Worker image: real profile photo wins, else map by primary role
export const getWorkerImage = (worker) => {
  if (worker?.profilePhoto) return worker.profilePhoto;
  const primaryRole = worker?.roles?.[0];
  return getRoleImage(primaryRole);
};

// Banner-sized crop for job cards (wider, no face-crop)
const toBanner = (url) => {
  if (url && url.includes('images.unsplash.com')) {
    return url.split('?')[0] + '?w=900&h=420&fit=crop&crop=entropy';
  }
  return url;
};

// Title keyword → role (compact copy of the backend backfill map, image-only)
const TITLE_ROLE_KEYWORDS = [
  ['plumb', 'Plumber'],
  ['electric', 'Electrician'], ['electrical', 'Electrician'], ['electronic', 'Electrician'],
  ['mason', 'Mason'], ['bricklay', 'Mason'],
  ['construct', 'Construction Worker'], ['build', 'Construction Worker'], ['demolit', 'Construction Worker'],
  ['paint', 'Painter'], ['wallpaper', 'Painter'],
  ['carpent', 'Carpenter'], ['furniture', 'Carpenter'], ['wood', 'Carpenter'], ['kitchen', 'Carpenter'],
  ['weld', 'Welder'], ['fabricat', 'Welder'],
  ['roof', 'Roofer'], ['terrace', 'Roofer'],
  ['tile', 'Tile Layer'], ['floor', 'Tile Layer'], ['marble', 'Tile Layer'], ['granite', 'Tile Layer'],
  ['clean', 'Cleaner'], ['housekeep', 'Cleaner'], ['safai', 'Cleaner'], ['car wash', 'Cleaner'],
  ['secur', 'Security Guard'], ['guard', 'Security Guard'],
  ['delivery', 'Delivery Boy'], ['courier', 'Delivery Boy'],
  ['driver', 'Driver'],
  ['cook', 'Cook'], ['chef', 'Cook'], ['tiffin', 'Cook'],
  ['baker', 'Baker'],
  ['tailor', 'Tailor'], ['stitch', 'Tailor'],
  ['beauti', 'Beautician'], ['parlour', 'Beautician'], ['makeup', 'Beautician'],
  ['barber', 'Barber'], ['salon', 'Barber'],
  ['mechanic', 'Mechanic'], ['tyre', 'Mechanic'],
  ['garden', 'Gardener'], ['landscap', 'Gardener'],
  ['machine op', 'Machine Operator'],
  ['plaster', 'Plasterer'], ['ceiling', 'Plasterer'],
  ['lock', 'Locksmith'],
  ['shoe', 'Cobbler'], ['cobbl', 'Cobbler'],
  ['farm', 'Farm Helper'], ['harvest', 'Farm Helper'], ['agriculture', 'Farm Helper'],
  ['data entry', 'Data Entry Operator'],
  ['hotel', 'Hotel Staff'], ['restaurant', 'Hotel Staff'], ['waiter', 'Hotel Staff'],
  ['nurse', 'Nurse Attendant'], ['patient', 'Nurse Attendant'],
  ['teacher', 'Teacher'], ['tutor', 'Teacher'],
  ['gym', 'Fitness Trainer'], ['trainer', 'Fitness Trainer'], ['yoga', 'Fitness Trainer'],
  ['massage', 'Massage Therapist'],
  ['app developer', 'App Developer'], ['developer', 'App Developer'],
  ['cctv', 'CCTV Technician'],
  ['ac ', 'AC Technician'], ['air conditioner', 'AC Technician'],
];

// Job image: explicit job role wins, else derive from the job title keywords
export const getJobImage = (job) => {
  const primaryRole = job?.jobRoles?.find(r => r.roleName)?.roleName;
  if (primaryRole) return toBanner(getRoleImage(primaryRole));
  const title = (job?.title || '').trim().toLowerCase();
  for (const [keyword, roleName] of TITLE_ROLE_KEYWORDS) {
    if (title.includes(keyword)) return toBanner(getRoleImage(roleName));
  }
  return toBanner(DEFAULT_ROLE_IMAGE);
};