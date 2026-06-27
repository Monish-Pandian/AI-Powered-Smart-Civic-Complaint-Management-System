import express from "express";

import {
  submitComplaint,
  getDepartmentComplaints,
  getMyComplaints,
  updateStatus,
  getHeatmapData
} from "../controllers/complaint.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// Create complaint
router.post("/", protect, submitComplaint);

// Citizen complaints
router.get("/my", protect, getMyComplaints);

// Officer/Admin complaints
router.get("/", protect, getDepartmentComplaints);

// Heatmap
router.get("/heatmap", protect, getHeatmapData);

// Update status
router.patch(
  "/:id/status",
  protect,
  authorize("Admin", "Officer"),
  updateStatus
);

export default router;