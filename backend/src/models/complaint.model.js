import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  description: String,

  department: [String],

  status: {
    type: String,
    enum: [
      "Submitted",
      "Assigned",
      "In Progress",
      "Resolved",
      "Escalated"
    ],
    default: "Submitted"
  },

  priorityScore: Number,

  officerName: String,
  officerEmail: String,

  statusLogs: [
    {
      status: String,
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  duplicateCount: {
    type: Number,
    default: 0
  },

  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [Number]
  },

  escalationLevel: {
    type: Number,
    default: 0
  },

  deadline: Date,

  assignedOfficer: String

}, { timestamps: true });

complaintSchema.index({ location: "2dsphere" });

export default mongoose.model("Complaint", complaintSchema);