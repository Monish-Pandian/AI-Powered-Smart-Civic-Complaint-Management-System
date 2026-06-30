import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";

const MONGO_URI = "mongodb://localhost:27017/comai";

const firstNames = [
  "Arun","Vijay","Karthik","Sanjay","Vignesh","Harish","Ramesh","Naveen",
  "Dinesh","Gokul","Hari","Praveen","Ajay","Suresh","Deepak","Arvind",
  "Mani","Lokesh","Ravi","Kiran","Bala","Saravanan","Prakash","Mohan",
  "Kumar","Raj","Senthil","Ganesh","Shiva","Yuvaraj","Dharun","Nikhil",
  "Rahul","Abinash","Sathish","Mithun","Jeeva","Vasanth","Ashwin"
];

const lastNames = [
  "Kumar","Raj","Sharma","Subramanian","Babu","Prasad","Reddy","Iyer",
  "Nair","Das","Menon","Pillai","Rao","Singh","Pandian","Vel",
  "Murugan","Lakshmi","Sundar","Kannan","Sekar","Rajan","Ravi","Arumugam"
];

const used = new Set();

function generateUniqueName(i) {
  while (true) {
    const f = firstNames[Math.floor(Math.random() * firstNames.length)];
    const l = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${f} ${l}`;

    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
}

function email(name) {
  return name.toLowerCase().replace(/\s/g, ".") + "@gmail.com";
}

function password(name) {
  return name.split(" ")[0] + "123";
}

const TOTAL_USERS = 500;

async function seed() {
  await mongoose.connect(MONGO_URI);
  await User.deleteMany({});

  const users = [];

  for (let i = 0; i < TOTAL_USERS; i++) {
    const name = generateUniqueName(i);

    users.push({
      name,
      email: email(name),
      password: await bcrypt.hash(password(name), 10),
      role: "User"
    });
  }

  await User.insertMany(users);

  console.log("5000 USERS INSERTED");
  process.exit();
}

seed().catch(console.error);