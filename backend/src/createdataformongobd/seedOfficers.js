import mongoose from "mongoose";
import Officer from "../models/officer.model.js";

const MONGO_URI = "mongodb://localhost:27017/comai";

const firstNames = [
  "Arun","Vijay","Karthik","Sanjay","Vignesh","Harish","Ramesh","Naveen",
  "Dinesh","Gokul","Hari","Praveen","Ajay","Suresh","Deepak","Arvind",
  "Mani","Lokesh","Ravi","Kiran","Bala","Saravanan","Prakash","Mohan",
  "Kumar","Raj","Senthil","Ganesh","Shiva","Yuvaraj","Dharun","Nikhil"
];

const lastNames = [
  "Kumar","Raj","Sharma","Subramanian","Babu","Prasad","Reddy","Iyer",
  "Nair","Das","Menon","Pillai","Rao","Singh","Pandian","Vel",
  "Murugan","Lakshmi","Sundar","Kannan","Sekar","Rajan","Ravi","Arumugam"
];

const departments = [
  "Water Supply",
  "Electricity",
  "Roads",
  "Sanitation",
  "Transport",
  "Drainage",
  "Municipal"
];

const used = new Set();

function generateUniqueName(i) {
  while (true) {
    const name =
      firstNames[Math.floor(Math.random() * firstNames.length)] +
      " " +
      lastNames[Math.floor(Math.random() * lastNames.length)];

    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
}

const TOTAL_OFFICERS = 500;

async function seed() {
  await mongoose.connect(MONGO_URI);
  await Officer.deleteMany({});

  const officers = [];

  for (let i = 0; i < TOTAL_OFFICERS; i++) {
    const name = generateUniqueName(i);

    officers.push({
      name,
      email: name.toLowerCase().replace(/\s/g, ".") + "@tn.gov.in",
      department: departments[i % departments.length],
      level: (i % 3) + 1,
      location: {
        type: "Point",
        coordinates: [
          80.2 + Math.random() * 0.5,
          13.0 + Math.random() * 0.5
        ]
      },
      activeCases: 0,
      resolvedCases: 0
    });
  }

  await Officer.insertMany(officers);

  console.log("500 OFFICERS INSERTED");
  process.exit();
}

seed().catch(console.error);