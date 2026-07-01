import mongoose from "mongoose";
import Complaint from "../models/complaint.model.js";
import Officer from "../models/officer.model.js";

const MONGO_URI = "mongodb://localhost:27017/comai";
const OFFICERS_BY_DEPARTMENT = new Map();
// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
// NOTE: "Municipal Administration" (not "Municipal") to match the department
// naming used in comai_officers.json, so officer assignment lookups work.
// "General" is intentionally excluded from random selection — it is only
// used as a fallback when generating a description for an unmapped department.
const DEPARTMENTS = [
  "Electricity",
  "Water Supply",
  "Municipal Administration",
  "Roads & Highways",
  "Traffic",
  "Police",
  "Health",
  "Fire & Emergency",
  "Environment",
  "Public Transport"
];
const FALLBACK_DEPARTMENT = "General";

const statuses = ["Submitted", "Assigned", "In Progress", "Resolved", "Escalated"];

// ---------------------------------------------------------------------------
// Realistic Tamil Nadu location dataset
// ---------------------------------------------------------------------------
const STREET_POOL = [
  "Gandhi Road",
  "Anna Salai",
  "VOC Road",
  "Market Road",
  "Mount Road",
  "Church Street",
  "Mill Road",
  "Lake View Road",
  "Trichy Road",
  "Coimbatore Road",
  "Station Road",
  "Bazaar Street",
  "Temple Street",
  "Hospital Road",
  "College Road",
  "Nehru Street",
  "Bharathi Street",
  "Periyar Road",
  "New Bus Stand Road",
  "West Masi Street"
];

const LANDMARK_POOL = [
  "Government Hospital",
  "Central Bus Stand",
  "Railway Station",
  "Corporation Office",
  "Municipal Park",
  "Police Station",
  "Water Tank",
  "Bus Depot",
  "Primary Health Centre",
  "Government School",
  "Community Hall",
  "Fire Station",
  "Market Complex",
  "Electricity Board Office",
  "Taluk Office",
  "Public Library"
];

function sample(pool, n) {
  const copy = [...pool];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// Each area carries its own approximate real-world lat/lng (rather than
// jittering off the city center) so complaint coordinates land much closer
// to the actual locality being described.
function buildAreas(areaDefs) {
  return areaDefs.map(({ name, lat, lng }) => ({
    name,
    lat,
    lng,
    streets: sample(STREET_POOL, 4),
    landmarks: sample(LANDMARK_POOL, 4)
  }));
}

const CITIES = [
  {
    name: "Chennai",
    areas: buildAreas([
      { name: "Anna Nagar", lat: 13.0850, lng: 80.2101 },
      { name: "T Nagar", lat: 13.0418, lng: 80.2341 },
      { name: "Velachery", lat: 12.9756, lng: 80.2207 },
      { name: "Adyar", lat: 13.0012, lng: 80.2565 },
      { name: "Guindy", lat: 13.0067, lng: 80.2206 },
      { name: "Tambaram", lat: 12.9249, lng: 80.1000 },
      { name: "Mylapore", lat: 13.0339, lng: 80.2619 },
      { name: "Porur", lat: 13.0374, lng: 80.1575 }
    ])
  },
  {
    name: "Coimbatore",
    areas: buildAreas([
      { name: "Peelamedu", lat: 11.0296, lng: 77.0266 },
      { name: "RS Puram", lat: 11.0018, lng: 76.9528 },
      { name: "Gandhipuram", lat: 11.0180, lng: 76.9673 },
      { name: "Saibaba Colony", lat: 11.0180, lng: 76.9376 },
      { name: "Ganapathy", lat: 11.0396, lng: 76.9662 },
      { name: "Singanallur", lat: 11.0004, lng: 77.0273 },
      { name: "Ramanathapuram", lat: 10.9800, lng: 76.9700 },
      { name: "Vadavalli", lat: 11.0233, lng: 76.9145 }
    ])
  },
  {
    name: "Madurai",
    areas: buildAreas([
      { name: "Anna Nagar", lat: 9.9195, lng: 78.1064 },
      { name: "KK Nagar", lat: 9.9394, lng: 78.1256 },
      { name: "Tallakulam", lat: 9.9280, lng: 78.1180 },
      { name: "Villapuram", lat: 9.8930, lng: 78.1300 },
      { name: "Simmakkal", lat: 9.9195, lng: 78.1215 },
      { name: "Goripalayam", lat: 9.9280, lng: 78.1080 }
    ])
  },
  {
    name: "Salem",
    areas: buildAreas([
      { name: "Fairlands", lat: 11.6716, lng: 78.1462 },
      { name: "Hasthampatti", lat: 11.6602, lng: 78.1462 },
      { name: "Suramangalam", lat: 11.6764, lng: 78.1264 },
      { name: "Ammapet", lat: 11.6483, lng: 78.1642 },
      { name: "Alagapuram", lat: 11.6656, lng: 78.1553 }
    ])
  },
  {
    name: "Tiruchirappalli",
    areas: buildAreas([
      { name: "Thillai Nagar", lat: 10.8046, lng: 78.6871 },
      { name: "Cantonment", lat: 10.8155, lng: 78.6919 },
      { name: "Srirangam", lat: 10.8624, lng: 78.6931 },
      { name: "KK Nagar", lat: 10.7995, lng: 78.6952 },
      { name: "Woraiyur", lat: 10.8194, lng: 78.6772 }
    ])
  }
];

// ---------------------------------------------------------------------------
// Description templates
// ---------------------------------------------------------------------------
const TEMPLATES = {
  Electricity: [
    (l) => `Transformer explosion reported behind ${l.landmark} in ${l.areaName}, ${l.cityName}.`,
    (l) => `Frequent power outages near ${l.landmark} on ${l.street}, ${l.areaName}.`,
    (l) => `Streetlights not working along ${l.street} near ${l.landmark}, ${l.areaName}.`,
    (l) => `Live wire hanging dangerously near ${l.landmark} on ${l.street}, ${l.areaName}.`
  ],
  "Water Supply": [
    (l) => `No drinking water supplied in ${l.areaName} for three days.`,
    (l) => `Water pipeline burst near ${l.landmark} on ${l.street}, ${l.areaName}.`,
    (l) => `Contaminated water supply reported near ${l.landmark}, ${l.areaName}.`,
    (l) => `Irregular water tanker supply in ${l.areaName} near ${l.street}.`
  ],
  "Municipal Administration": [
    (l) => `Garbage has not been collected near ${l.street} since last week.`,
    (l) => `Overflowing garbage bin reported opposite ${l.landmark}, ${l.areaName}.`,
    (l) => `Public toilet near ${l.landmark} in poor sanitary condition.`,
    (l) => `Stray dog menace reported near ${l.landmark} on ${l.street}, ${l.areaName}.`
  ],
  "Roads & Highways": [
    (l) => `Large pothole opposite ${l.landmark} on ${l.street}.`,
    (l) => `Severe drainage overflow near ${l.landmark} on ${l.street}, ${l.areaName}.`,
    (l) => `Broken road divider near ${l.landmark}, ${l.areaName} causing traffic hazards.`,
    (l) => `Waterlogging reported on ${l.street} near ${l.landmark} after heavy rains.`
  ],
  Traffic: [
    (l) => `Traffic signal malfunctioning near ${l.landmark} on ${l.street}.`,
    (l) => `Heavy traffic congestion reported near ${l.landmark}, ${l.areaName} during peak hours.`,
    (l) => `Illegal parking blocking road near ${l.landmark} on ${l.street}.`,
    (l) => `Missing traffic signage near ${l.landmark}, ${l.areaName}.`
  ],
  Police: [
    (l) => `Chain snatching incident reported near ${l.landmark} on ${l.street}.`,
    (l) => `Suspicious activity reported near ${l.landmark}, ${l.areaName}.`,
    (l) => `Noise complaint filed against a gathering near ${l.landmark}, ${l.areaName}.`,
    (l) => `Theft reported near ${l.landmark} on ${l.street}, ${l.areaName}.`
  ],
  Health: [
    (l) => `Mosquito breeding reported in stagnant water close to ${l.landmark}, ${l.areaName}.`,
    (l) => `Unhygienic conditions reported near ${l.landmark} on ${l.street}.`,
    (l) => `Shortage of medicines reported at ${l.landmark}, ${l.areaName}.`,
    (l) => `Delay in ambulance response reported near ${l.landmark}, ${l.areaName}.`
  ],
  "Fire & Emergency": [
    (l) => `Minor fire outbreak reported near ${l.landmark} on ${l.street}.`,
    (l) => `Fire hydrant found non-functional near ${l.landmark}, ${l.areaName}.`,
    (l) => `Gas leakage reported near ${l.landmark}, ${l.areaName}.`,
    (l) => `Short circuit caused a minor fire near ${l.landmark} on ${l.street}.`
  ],
  Environment: [
    (l) => `Illegal dumping of construction waste reported near ${l.landmark}, ${l.areaName}.`,
    (l) => `Air pollution from open waste burning reported near ${l.landmark} on ${l.street}.`,
    (l) => `Unauthorized tree felling reported near ${l.landmark}, ${l.areaName}.`,
    (l) => `Noise pollution reported near ${l.landmark}, ${l.areaName}.`
  ],
  "Public Transport": [
    (l) => `Bus not stopping at the designated stop near ${l.landmark}, ${l.areaName}.`,
    (l) => `Overcrowded bus service reported near ${l.landmark} on ${l.street}.`,
    (l) => `Bus stop shelter damaged near ${l.landmark}, ${l.areaName}.`,
    (l) => `Frequent delays in bus service reported near ${l.landmark}, ${l.areaName}.`
  ],
  [FALLBACK_DEPARTMENT]: [
    (l) => `Civic issue reported near ${l.landmark} on ${l.street}, ${l.areaName}.`,
    (l) => `Resident complaint registered near ${l.landmark}, ${l.areaName}.`
  ]
};

// ---------------------------------------------------------------------------
// Officers (loaded from comai_officers.json, kept in the same folder as this
// script — adjust OFFICERS_PATH if you store it elsewhere)
// ---------------------------------------------------------------------------


/**
 * Haversine distance between two [lng, lat] points, in kilometers.
 */
function haversineDistanceKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds the officer belonging to `department` whose location is geographically
 * closest to the complaint's coordinates. Falls back to a random officer from
 * the department (or null) if no distance-based match is available.
 */
function findNearestOfficer(department, complaintCoordinates) {
  const candidates = OFFICERS_BY_DEPARTMENT.get(department);
  if (!candidates || candidates.length === 0) return null;

  let nearest = candidates[0];
  let nearestDistance = haversineDistanceKm(complaintCoordinates, nearest.coordinates);

  for (let i = 1; i < candidates.length; i++) {
    const distance = haversineDistanceKm(complaintCoordinates, candidates[i].coordinates);
    if (distance < nearestDistance) {
      nearest = candidates[i];
      nearestDistance = distance;
    }
  }

  return nearest;
}

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

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------

/**
 * Picks a single real-world location (city + area + street + landmark)
 * along with GPS coordinates that fall inside that same city. Returns one
 * object so the description and coordinates always refer to the same place.
 */
function pickLocation() {
  const city = pick(CITIES);
  const area = pick(city.areas);
  const street = pick(area.streets);
  const landmark = pick(area.landmarks);

  // Small jitter (~0-500m) around the area's own coordinates so points stay
  // realistically clustered within that specific locality instead of
  // spreading across the whole city.
  const coordinates = [
    area.lng + rand(-0.004, 0.004),
    area.lat + rand(-0.004, 0.004)
  ];

  return {
    cityName: city.name,
    areaName: area.name,
    street,
    landmark,
    coordinates
  };
}

/**
 * Picks a department for a complaint. "General" is deliberately excluded
 * since it is a fallback-only category used when a description template
 * is unavailable for a department.
 */
function pickDepartment() {
  return pick(DEPARTMENTS);
}

/**
 * Generates a realistic, human-like complaint description tied to the
 * exact same location (city/area/street/landmark) as the GPS coordinates.
 */
function generateDescription(department, loc) {
  const templates = TEMPLATES[department] || TEMPLATES[FALLBACK_DEPARTMENT];
  const template = pick(templates);
  return template(loc);
}

function generatePriority() {
  return Math.random().toFixed(2);
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
  const department = pickDepartment();
  const loc = pickLocation();

  const status =
    Math.random() < 0.1 ? "Escalated" :
    Math.random() < 0.6 ? "Resolved" :
    pick(statuses);

  const createdAt = new Date(Date.now() - rand(1, 90) * 86400000);

  // Assign the officer from this department whose location is nearest to
  // the complaint's coordinates. Complaint coordinates are stored as
  // [lng, lat] (GeoJSON order), matching officer.location.coordinates,
  // so they can be passed straight into findNearestOfficer as-is.
  const officer = findNearestOfficer(department, loc.coordinates);

  return {
    userId: USER_IDS[i % USER_IDS.length],
    description: generateDescription(department, loc),
    department: [department],
    status,
    priorityScore: generatePriority(),
    officerName: officer ? officer.name : undefined,
    officerEmail: officer ? officer.email : undefined,
    assignedOfficer: officer ? officer.id : undefined,
    location: {
      type: "Point",
      coordinates: loc.coordinates
    },
    statusLogs: statusFlow(status),
    duplicateCount: Math.floor(Math.random() * 5),
    escalationLevel: status === "Escalated" ? Math.floor(rand(1, 3)) : 0,
    createdAt,
    updatedAt: createdAt
  };
}

const TOTAL = 10000;

async function seed() {
  await mongoose.connect(MONGO_URI);
 

const rawOfficers = await Officer.find().lean();
OFFICERS_BY_DEPARTMENT.clear();

for (const officer of rawOfficers) {
  const normalized = {
    id: officer._id,
    name: officer.name,
    email: officer.email,
    department: officer.department,
    level: officer.level,
    coordinates: officer.location.coordinates
  };

  if (!OFFICERS_BY_DEPARTMENT.has(normalized.department)) {
    OFFICERS_BY_DEPARTMENT.set(normalized.department, []);
  }

  OFFICERS_BY_DEPARTMENT.get(normalized.department).push(normalized);
}
  
  await Complaint.deleteMany({});
  const data = [];
  for (let i = 0; i < TOTAL; i++) {
    data.push(generateComplaint(i));
  }

  await Complaint.insertMany(data);

  console.log("10000 COMPLAINTS INSERTED");
  process.exit();
}

seed().catch(console.error);