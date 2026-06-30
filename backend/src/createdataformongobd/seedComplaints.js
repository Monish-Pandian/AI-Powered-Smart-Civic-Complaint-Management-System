import mongoose from "mongoose";
import Complaint from "../models/complaint.model.js";

const MONGO_URI = "mongodb://localhost:27017/comai";

const departments = [
  "Water Supply",
  "Electricity",
  "Roads",
  "Sanitation",
  "Transport",
  "Muni"
];

const statuses = ["Submitted", "Assigned", "In Progress", "Resolved", "Escalated"];

const locations = [
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Salem", lat: 11.6643, lng: 78.1460 },
  { name: "Trichy", lat: 10.7905, lng: 78.7047 }
];

// must match seeded users range
const USER_IDS = Array.from({ length: 5000 }, (_, i) =>
  new mongoose.Types.ObjectId()
);

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickLocation() {
  const city = pick(locations);
  return {
    type: "Point",
    coordinates: [
      city.lng + rand(-0.1, 0.1),
      city.lat + rand(-0.1, 0.1)
    ]
  };
}

function statusFlow(status) {
  const logs = ["Submitted", "Assigned", "In Progress", "Resolved"];
  const out = [];

  for (let s of logs) {
    out.push({
      status: s,
      updatedAt: new Date(Date.now() - rand(1, 30) * 86400000)
    });
    if (s === status) break;
  }

  if (status === "Escalated") {
    out.push({ status: "Escalated", updatedAt: new Date() });
  }

  return out;
}

function generateComplaint(i) {
  const dept = pick(departments);

  const status =
    Math.random() < 0.1 ? "Escalated" :
    Math.random() < 0.6 ? "Resolved" :
    pick(statuses);

  const createdAt = new Date(Date.now() - rand(1, 90) * 86400000);

  return {
    userId: USER_IDS[i % USER_IDS.length],
    description: `${dept} issue reported in ${pick(locations).name}`,
    department: [dept],
    status,
    priorityScore: Math.random().toFixed(2),
    location: pickLocation(),
    statusLogs: statusFlow(status),
    duplicateCount: Math.floor(Math.random() * 5),
    escalationLevel: status === "Escalated" ? Math.floor(rand(1, 3)) : 0,
    createdAt,
    updatedAt: createdAt
  };
}

const TOTAL = 5000;

async function seed() {
  await mongoose.connect(MONGO_URI);
  await Complaint.deleteMany({});

  const data = [];

  for (let i = 0; i < TOTAL; i++) {
    data.push(generateComplaint(i));
  }

  await Complaint.insertMany(data);

  console.log("5000 COMPLAINTS INSERTED");
  process.exit();
}

seed().catch(console.error);