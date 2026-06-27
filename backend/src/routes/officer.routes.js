import express from "express";

import {
  createOfficer,
  getOfficers,
  updateOfficer,
  deleteOfficer,
  getOfficerById
} from "../controllers/officer.controller.js";

import {
  protect
} from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
const router = express.Router();

router.post(
  "/",
  protect,
  authorize("Admin"),
  createOfficer
);

router.get(
  "/",
  protect,
  authorize("Admin"),
  getOfficers
);

router.get("/:id", getOfficerById);

router.put(
  "/:id",
  protect,
  authorize("Admin"),
  updateOfficer
);

router.delete(
  "/:id",
  protect,
  authorize("Admin"),
  deleteOfficer
);

export default router;