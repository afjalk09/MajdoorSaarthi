const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const firstNames = [
  "Rahul", "Amit", "Suresh", "Rajesh", "Vikram", "Sanjay", "Anil", "Deepak",
  "Manoj", "Ravi", "Sunil", "Vinod", "Ajay", "Prakash", "Sachin", "Vijay",
  "Ramesh", "Dinesh", "Mahesh", "Naresh", "Krishna", "Ganesh", "Mohan",
  "Shankar", "Gopal", "Madhav", "Balaram", "Lakshman", "Hanuman", "Bheem",
  "Arjun", "Karan", "Nakul", "Sahadev", "Yudhishthir", "Bharat", "Shatrughan",
  "Laxman", "Prahlad", "Bali", " Sugriva", "Angad", "Jambavan", "Nala",
  "Damayanti", "Sita", "Urmila", "Mandavi", "Shrutakirti", "Draupadi",
  "Subhadra", "Tara", "Ruma", "Anjana", "Anasuya", "Kausalya", "Sumitra",
  "Kaikeyi", "Manthara", "Shabari", "Ahilya", "Tara", "Chitrangada",
  "Droupadi", "Hidimbi", "Subhadra", "Satyavati", "Amba", "Ambika",
  "Ambalika", "Kunti", "Gandhari", "Madri", "Ulupi", "Chitrangada",
  "Babhruvahana", "Barbarika", "Ghatotkacha", "Abhimanyu", "Iravan",
  "Prativindhya", "Sushasana", "Srutakarma", "Satkarna", "Satyaki",
  "Dhrishtadyumna", "Shikhandi", "Yuyutsu", "Vrishaketu", "Borikara",
  "Upapandavas", "Prinivasa", "Suhotra", "Anga", "Suhma", "Pundra",
  "Vanga", "Kalinga", "Andhra", "Dravida", "Chera", "Chola", "Pandya",
];

const lastNames = [
  "Kumar", "Singh", "Sharma", "Verma", "Gupta", "Yadav", "Mishra", "Pandey",
  "Tiwari", "Chaudhary", "Jha", "Reddy", "Nair", "Menon", "Iyer", "Mistry",
  "Patel", "Shah", "Mehta", "Desai", "Joshi", "Rao", "Prasad", "Das",
  "Banerjee", "Mukherjee", "Ghosh", "Sen", "Dutta", "Chakraborty", "Bose",
  "Roy", "Lahiri", "Sinha", "Thakur", "Chauhan", "Rathore", "Pawar",
  "Jadhav", "Shinde", "Bhosle", "Gawde", "Koli", "Naik", "D'Souza",
  "Fernandes", "Pereira", "Dsouza", "Correa", "Monteiro", "Gomes",
  "Khandekar", "Deshmukh", "Wankhede", "Kolhe", "Auti", "Gawali",
  "Suryavanshi", "Rajput", "Chandel", "Bundela", "Patel", "Thakor",
  "Gohil", "Vaghela", "Solanki", "Chavda", "Parmar", "Rabari",
  "Kharadi", "Dhabalia", "Bambhaniya", "Vanzara", "Sinhmar",
  "Rathod", "Barot", "Golwal", "Machhar", "Vadher", "Sutariya",
  "Vasava", "Gamit", "Tadvi", "Chaudhari", "Pateliya", "Bhocolia",
  "Katela", "Roda", "Malavia", "Napit", "Mandavi", "Usendi",
  "Nakum", " Jadeja", "Sodha", "Vaghela", "Chudasama", "Gohil",
  "Wala", "Mokariya", "Dodiyar", "Kathad", "Bhilala", "Meena",
  "Bishnoi", "Saraf", "Kanungo", "Mohanty", "Sahoo", "Swain",
  "Behera", "Jena", "Parida", "Rath", "Bhoi", "Bisia",
  "Naik", "Dangi", "Mevada", "Bharvad", "Ahir", "Rajpurohit",
];

const skillSets = [
  ["plumbing", "pipefitting"],
  ["electrical", "wiring"],
  ["carpentry", "furniture making"],
  ["masonry", "bricklaying"],
  ["painting", "wallpapering"],
  ["welding", "metal fabrication"],
  ["roofing", "tile work"],
  ["landscaping", "gardening"],
  ["cleaning", "sanitation"],
  ["driving", "logistics"],
  ["cooking", "food preparation"],
  ["tailoring", "stitching"],
  ["beauty", "hairdressing"],
  ["ac repair", "refrigeration"],
  ["pest control", "fumigation"],
  ["security", "guarding"],
  ["construction", "demolition"],
  ["scaffolding", "height work"],
  ["plastering", "wall finishing"],
  ["tile laying", "flooring"],
  ["glass work", "glazing"],
  ["locksmith", "key cutting"],
  ["shoe repair", "cobbler work"],
  ["printing", "screen printing"],
  ["packaging", "warehouse work"],
  ["loading", "unloading"],
  ["machine operation", "heavy equipment"],
  ["solar panel installation", "electrical maintenance"],
  ["cctv installation", "network cabling"],
  ["water tank cleaning", "pressure washing"],
  ["upholstery", "fabric repair"],
  ["jewelry repair", "polishing"],
  ["bicycle repair", "two-wheeler maintenance"],
  ["mobile repair", "electronics repair"],
  ["photo framing", "lamination"],
  ["embroidery", "handicrafts"],
  ["rubber stamp making", "engraving"],
  ["tent house setup", "event decoration"],
  ["mechanic", "automobile repair"],
  ["agriculture", "farming"],
];

const cities = [
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
  { name: "Patna", lat: 25.6093, lng: 85.1376 },
  { name: "Indore", lat: 22.7196, lng: 75.8577 },
  { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
  { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
  { name: "Surat", lat: 21.1702, lng: 72.8311 },
  { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
  { name: "Amritsar", lat: 31.634, lng: 74.8723 },
  { name: "Varanasi", lat: 25.3176, lng: 82.9739 },
  { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Nashik", lat: 19.9975, lng: 73.7898 },
  { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
  { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Mysore", lat: 12.2958, lng: 76.6394 },
  { name: "Hubli", lat: 15.3647, lng: 75.124 },
  { name: "Belgaum", lat: 15.8497, lng: 74.4977 },
];

const availabilities = ["AVAILABLE", "BUSY", "UNAVAILABLE"];
const wageTypes = ["DAILY", "HOURLY", "PROJECT"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generatePhone(index) {
  const prefixes = ["98", "97", "96", "95", "94", "93", "92", "91", "90", "89", "88", "87", "86", "85", "84", "83", "82", "81", "80", "79", "78", "77", "76", "75", "74", "73", "72", "71", "70", "69", "68", "67", "66", "65", "64", "63", "62", "61", "60", "59", "58", "57", "56", "55", "54", "53", "52", "51", "50"];
  const prefix = randomItem(prefixes);
  const suffix = String(1000000 + index * 7 + Math.floor(Math.random() * 1000)).padStart(7, "0");
  return prefix + suffix.slice(-7);
}

async function main() {
  console.log("Seeding 100 worker profiles...\n");

  const passwordHash = await bcrypt.hash("Worker@123", 10);

  // Clear existing seed data
  await prisma.user.deleteMany({ where: { role: "WORKER" } });
  console.log("Cleared existing worker data.\n");

  let created = 0;

  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@worker.com`;
    const phone = generatePhone(i);
    const city = randomItem(cities);
    const skills = randomSubset(skillSets[Math.floor(Math.random() * skillSets.length)], 1, 3);
    const experienceYears = Math.floor(Math.random() * 20) + 1;
    const availability = randomItem(availabilities);
    const wageType = randomItem(wageTypes);
    const wageMin = Math.floor(Math.random() * 500) + 300;
    const wageMax = wageMin + Math.floor(Math.random() * 1000) + 200;
    const reliabilityScore = Math.round((Math.random() * 4 + 1) * 10) / 10;
    const isVerified = Math.random() > 0.3;

    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    try {
      await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: "WORKER",
          workerProfile: {
            create: {
              fullName,
              skills,
              experienceYears,
              locationLat: city.lat + latOffset,
              locationLng: city.lng + lngOffset,
              locationText: city.name,
              availability,
              expectedWageMin: wageMin,
              expectedWageMax: wageMax,
              wageType,
              reliabilityScore,
              isVerified,
            },
          },
        },
      });
      created++;
      process.stdout.write(`\rCreated: ${created}/100`);
    } catch (err) {
      console.error(`\nFailed at index ${i}: ${err.message}`);
    }
  }

  console.log(`\n\nDone! Created ${created} worker profiles.`);
  console.log("Login credentials: Any email above with password: Worker@123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
