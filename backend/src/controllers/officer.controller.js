import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Officer from "../models/officer.model.js";

export const createOfficer = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      level,
      latitude,
      longitude
    } = req.body;

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    await User.create({
  name,
  email,
  password: hashedPassword,
  role: "Officer",
  department
});

    await Officer.create({
      name,
      email,
      department,
      level,
      location: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    });

    res.status(201).json({
      message: "Officer created successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error"
    });
  }
};
export const getOfficers = async (req, res) => {
  try {
    const officers = await Officer.find()
      .sort({ department: 1, level: 1 });

    res.json(officers);

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};
export const updateOfficer = async (req, res) => {
  try {

    const officer =
      await Officer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!officer) {
      return res.status(404).json({
        message: "Officer not found"
      });
    }

    res.json(officer);

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};
export const getOfficerById = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        message: "Officer not found"
      });
    }

    res.json(officer);

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};
export const deleteOfficer = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);

    if (!officer) {
      return res.status(404).json({
        message: "Officer not found"
      });
    }

    await User.deleteOne({
      email: officer.email
    });

    await officer.deleteOne();

    res.json({
      message: "Officer deleted"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server Error"
    });
  }
};