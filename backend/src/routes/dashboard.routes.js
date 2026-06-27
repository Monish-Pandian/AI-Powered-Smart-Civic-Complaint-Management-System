import express from "express";
import {
 getDashboardStats,
 getDepartmentStats,
 getStatusStats
} from "../controllers/dashboard.controller.js";

import { getOfficerStats } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();
router.get(
  "/stats",
  protect,
  authorize("Admin"),
  getDashboardStats
);
router.get(
 "/officers",
 protect,
 authorize("Admin"),
 getOfficerStats
);
router.get(
  "/status", protect,
 authorize("Admin"),
  getStatusStats
);

router.get(
 "/departments",
 protect,
 authorize("Admin"),
 getDepartmentStats
);

export default router;