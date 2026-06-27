import Complaint from "../models/complaint.model.js";
import { detectDepartments } from "../services/aiRouting.service.js";
import { calculatePriority } from "../services/priority.service.js";
import { isSimilarComplaint } from "../services/duplicate.service.js";
import { findNearbyComplaints } from "../services/location.service.js";
import { assignOfficer } from "../services/assignment.service.js";
import { sendStatusEmail } from "../services/notification.service.js";


// ✅ SUBMIT COMPLAINT
export const submitComplaint = async (req, res) => {
  try {
    const { description, latitude, longitude } = req.body;

    // NEW — add await
const departments = await detectDepartments(description);

    const priority = calculatePriority(description);

    const officer = await assignOfficer(
      departments,
      latitude,
      longitude
    );

    const now = new Date();

    const hours =
      priority > 0.8 ? 6 :
      priority > 0.6 ? 12 :
      priority > 0.4 ? 24 :
      48;

    const deadline = new Date(
      now.getTime() + hours * 60 * 60 * 1000
    );

    const nearbyComplaints =
      await findNearbyComplaints(longitude, latitude);

    let parent = null;

    for (let c of nearbyComplaints) {
      if (isSimilarComplaint(description, c.description)) {
        parent = c;
        c.duplicateCount += 1;
        await c.save();
        break;
      }
    }

    const complaint = new Complaint({
      description,

      // ✅ USER OWNER
      userId: req.user.id,

      department: departments,
      priorityScore: priority,

      officerName: officer?.name,
      officerEmail: officer?.email,

      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      },

      status: officer ? "Assigned" : "Submitted",

      statusLogs: [
        {
          status: officer
            ? "Assigned"
            : "Submitted"
        }
      ],

      deadline
    });

    await complaint.save();

    const io = req.app.get("io");

    io.to(complaint.department[0]).emit(
      "newComplaint",
      complaint
    );

    await sendStatusEmail(complaint);

    res.status(201).json(complaint);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error"
    });
  }
};


// ✅ USER VIEW ONLY HIS COMPLAINTS
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(complaints);

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};



export const getDepartmentComplaints = async (req, res) => {
  try {

    console.log("Logged User:", req.user);

    let complaints = [];

    if (req.user.role === "Admin") {
      complaints = await Complaint.find()
        .sort({ createdAt: -1 });
    } else {
      complaints = await Complaint.find({
        officerEmail: req.user.email
      }).sort({ createdAt: -1 });
    }

    console.log("Complaints Found:", complaints.length);

    res.json(complaints);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });
  }
};


// ✅ UPDATE STATUS
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const complaint =
      await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Not found"
      });
    }

    if (req.user.role !== "Admin") {
      if (
        complaint.officerEmail !== req.user.email
      ) {
        return res.status(403).json({
          message: "Not allowed"
        });
      }
    }

    complaint.status = status;

    complaint.statusLogs.push({
      status
    });

    await complaint.save();

    const io = req.app.get("io");

    io.to(complaint.department[0]).emit(
      "statusUpdated",
      complaint
    );

    await sendStatusEmail(complaint);

    res.json(complaint);

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};


export const getHeatmapData = async (req, res) => {
  try {

    let matchStage = {};

    // ✅ ADMIN → see all complaints
    if (req.user.role === "Admin") {
      matchStage = {};
    }

    // ✅ OFFICER → only his department
    else if (req.user.role === "Officer") {
      matchStage = {
        department: req.user.department
      };
    }

    const complaints = await Complaint.aggregate([
      {
        $match: matchStage
      },
      {
        $project: {
          lng: {
            $arrayElemAt: ["$location.coordinates", 0]
          },
          lat: {
            $arrayElemAt: ["$location.coordinates", 1]
          }
        }
      },
      {
        $group: {
          _id: {
            lng: { $round: ["$lng", 2] },
            lat: { $round: ["$lat", 2] }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    console.log("Role:", req.user.role);
console.log("Department:", req.user.department);
    res.json(complaints);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error"
    });
  }
};