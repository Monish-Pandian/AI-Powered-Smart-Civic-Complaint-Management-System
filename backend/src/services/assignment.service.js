import Officer from "../models/officer.model.js";
import Complaint from "../models/complaint.model.js";

export const assignOfficer = async (
  departments,
  longitude,
  latitude
) => {
  try {
    const dept = departments[0];

    console.log("================================");
    console.log("Department Detected:", dept);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);

    const allOfficers = await Officer.find();

    console.log("All Officers:");
    console.log(
      allOfficers.map((o) => ({
        name: o.name,
        email: o.email,
        department: o.department,
        level: o.level
      }))
    );

    let officers = await Officer.find({
      department: dept,
      level: 1,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000
        }
      }
    });

    console.log("Nearby Officers Found:");
    console.log(officers);

    if (!officers.length) {
      console.log(
        "No nearby officers. Trying department fallback..."
      );

      officers = await Officer.find({
        department: dept,
        level: 1
      });

      console.log("Fallback Officers:");
      console.log(officers);
    }

    if (!officers.length) {
      console.log("❌ No officers found");
      return null;
    }

    let selectedOfficer = null;
    let minLoad = Infinity;

    for (const officer of officers) {
      const count = await Complaint.countDocuments({
        officerEmail: officer.email,
        status: { $ne: "Resolved" }
      });

      console.log(
        `${officer.name} -> Active Complaints: ${count}`
      );

      if (count < minLoad) {
        minLoad = count;
        selectedOfficer = officer;
      }
    }

    console.log(
      "✅ Selected Officer:",
      selectedOfficer.name
    );

    return selectedOfficer;

  } catch (error) {
    console.error("Assign Officer Error:", error);
    return null;
  }
};