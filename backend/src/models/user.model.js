import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  name: String,

  email: {
    type: String,
    unique: true
  },

  password: String,

  role: {
    type: String,
    enum: ["Admin", "Officer", "User"],
    default: "User"
  },

  department: String

}, { timestamps: true });

export default mongoose.model("User", userSchema);