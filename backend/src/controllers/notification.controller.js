import Complaint from "../models/complaint.model.js";

export const getNotifications = async (req, res) => {
  try {

    let notifications = [];

    // ADMIN
    if (req.user.role === "Admin") {

      notifications = await Complaint.find()
        .sort({ createdAt: -1 })
        .limit(10);

    }

    // OFFICER
    else if (req.user.role === "Officer") {

      notifications = await Complaint.find({
        officerEmail: req.user.email
      })
      .sort({ updatedAt: -1 })
      .limit(10);

    }

    // USER
    else {

      notifications = await Complaint.find({
        userId: req.user.id
      })
      .sort({ updatedAt: -1 })
      .limit(10);

    }

    res.json(notifications);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server Error"
    });

  }
};