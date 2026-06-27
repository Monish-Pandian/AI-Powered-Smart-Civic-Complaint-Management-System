import Complaint from "../models/complaint.model.js";
import Officer from "../models/officer.model.js";
import { sendEscalationEmail } from "./notification.service.js";

export const checkEscalations = async () => {

  const now = new Date();

  const complaints = await Complaint.find({
    status: { $ne: "Resolved" },
    deadline: { $lt: now }
  });

  for (let c of complaints) {

    if (c.escalationLevel >= 3) continue;

    const currentOfficer = await Officer.findOne({
      email: c.officerEmail
    });

    if (!currentOfficer) continue;

    const higherOfficer = await Officer.findOne({
      department: c.department[0],
      level: currentOfficer.level + 1
    });

    if (!higherOfficer) {
      console.log("⚠️ Already highest level");
      continue;
    }

    c.escalationLevel += 1;

    c.officerName = higherOfficer.name;
    c.officerEmail = higherOfficer.email;
    c.assignedLevel = higherOfficer.level;

    c.status = "Escalated";

    c.deadline = new Date(
      now.getTime() + 12 * 60 * 60 * 1000
    );

    c.statusLogs.push({
      status: "Escalated",
      updatedAt: new Date()
    });

    await c.save();

    const io = global.io;
    io.to(c.department[0]).emit("updateComplaint", c);

    await sendEscalationEmail(c);

    console.log(`Escalated complaint ${c._id}`);
  }
};