const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const firstNames = [
  "Amit", "Rajesh", "Suresh", "Vikram", "Sanjay", "Anil", "Deepak", "Manoj",
  "Ravi", "Sunil", "Vinod", "Ajay", "Prakash", "Sachin", "Vijay", "Ramesh",
  "Dinesh", "Mahesh", "Naresh", "Krishna", "Ganesh", "Mohan", "Shankar",
  "Gopal", "Arjun", "Karan", "Bharat", "Laxman", "Pravin", "Bhavesh",
  "Chirag", "Darshan", "Falgun", "Gaurav", "Hitesh", "Irfan", "Jignesh",
  "Ketan", "Lalit", "Mihir", "Nikhil", "Omkar", "Parth", "Rajiv", "Sagar",
  "Tejas", "Uday", "Vivek", "Yogesh", "Zaveri",
];

const lastNames = [
  "Kumar", "Singh", "Sharma", "Verma", "Gupta", "Yadav", "Mishra", "Pandey",
  "Tiwari", "Chaudhary", "Jha", "Reddy", "Nair", "Menon", "Iyer", "Mistry",
  "Patel", "Shah", "Mehta", "Desai", "Joshi", "Rao", "Prasad", "Das",
  "Banerjee", "Mukherjee", "Ghosh", "Sen", "Dutta", "Chakraborty", "Bose",
  "Roy", "Lahiri", "Sinha", "Thakur", "Chauhan", "Rathore", "Pawar",
  "Jadhav", "Shinde", "Bhosle", "Gawde", "Koli", "Naik", "D'Souza",
  "Fernandes", "Pereira", "Correa", "Monteiro", "Gomes", "Khandekar",
  "Deshmukh", "Wankhede", "Kolhe", "Auti", "Gawali", "Suryavanshi",
  "Rajput", "Chandel", "Bundela", "Vaghela", "Solanki", "Chavda", "Parmar",
];

const companyNames = [
  "Construction", "Builders", "Infra", "Developers", "Enterprises", "Groups",
  "Corporation", "Projects", "Solutions", "Services", "Holdings", "Ventures",
  "Real Estate", "Constructions", "Engineering", "Technologies", "Industries",
  "Trading", "Manufacturing", "Power", "Energy", "Systems", "Materials",
];

const companySuffixes = [
  "Pvt Ltd", "Ltd", "LLP", "Corp", "Inc", "& Sons", "& Co", "Group",
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
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Mysore", lat: 12.2958, lng: 76.6394 },
  { name: "Hubli", lat: 15.3647, lng: 75.124 },
  { name: "Belgaum", lat: 15.8497, lng: 74.4977 },
  { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
];

const employerTypes = ["INDIVIDUAL", "CONTRACTOR", "COMPANY"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(index) {
  const prefix = randomItem(["98", "97", "96", "95", "94", "93", "92", "91", "90", "89", "88", "87", "86", "85"]);
  const suffix = String(2000000 + index * 11 + Math.floor(Math.random() * 1000)).padStart(7, "0");
  return prefix + suffix.slice(-7);
}

function generateAadhaar() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(String(Math.floor(Math.random() * 10000)).padStart(4, "0"));
  }
  return parts.join(" ");
}

function generatePan() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let pan = "";
  for (let i = 0; i < 5; i++) pan += letters[Math.floor(Math.random() * 26)];
  pan += digits[Math.floor(Math.random() * 10)];
  for (let i = 0; i < 3; i++) pan += letters[Math.floor(Math.random() * 26)];
  pan += letters[Math.floor(Math.random() * 26)];
  return pan;
}

function generateCompanyReg() {
  const prefix = randomItem(["U", "L", "F"]);
  const num = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  const state = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const type = randomItem(["PTC", "PLC", "LLP", "OPT", "TGT"]);
  const year = String(Math.floor(Math.random() * 20) + 2000);
  return `${prefix}${num}${state}${type}${year.slice(-2)}${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
}

function generateDisplayName(employerType, firstName, lastName) {
  if (employerType === "COMPANY") {
    return `${firstName} ${lastName} ${randomItem(companyNames)} ${randomItem(companySuffixes)}`.trim();
  }
  if (employerType === "CONTRACTOR") {
    return `${firstName} ${lastName} Contractors`;
  }
  return `${firstName} ${lastName}`;
}

async function main() {
  console.log("Seeding 100 employer profiles...\n");

  const passwordHash = await bcrypt.hash("Employer@123", 10);

  await prisma.user.deleteMany({ where: { role: "EMPLOYER" } });
  console.log("Cleared existing employer data.\n");

  let created = 0;

  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@employer.com`;
    const phone = generatePhone(i);
    const city = randomItem(cities);
    const employerType = randomItem(employerTypes);
    const displayName = generateDisplayName(employerType, firstName, lastName);
    const contactPerson = `${firstName} ${lastName}`;
    const aadhaarNumber = generateAadhaar();
    const panNumber = generatePan();
    const companyRegNumber = employerType === "COMPANY" ? generateCompanyReg() : null;
    const isVerified = Math.random() > 0.3;

    const latOffset = (Math.random() - 0.5) * 0.1;
    const lngOffset = (Math.random() - 0.5) * 0.1;

    try {
      await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: "EMPLOYER",
          employerProfile: {
            create: {
              employerType,
              displayName,
              contactPerson,
              aadhaarNumber,
              panNumber,
              companyRegNumber,
              locationLat: city.lat + latOffset,
              locationLng: city.lng + lngOffset,
              locationText: city.name,
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

  console.log(`\n\nDone! Created ${created} employer profiles.`);
  console.log("Login credentials: Any email above with password: Employer@123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
