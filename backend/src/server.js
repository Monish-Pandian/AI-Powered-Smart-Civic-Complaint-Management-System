import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import complaintRoutes from "./routes/complaint.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import officerRoutes from "./routes/officer.routes.js";
import "./cron/escalation.cron.js";
import authRoutes from "./routes/auth.routes.js";
import notificationRoutes
from "./routes/notification.routes.js";


dotenv.config();

const app = express();

// create HTTP server
const server = http.createServer(app);

// attach socket.io
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// make io available globally
app.set("io", io);

app.use(cors());
app.use(express.json());

connectDB();
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/officers", officerRoutes);
app.use(
  "/api/notifications",
  notificationRoutes
);
// socket connection
io.on("connection", (socket) => {

  console.log("⚡ Client connected:", socket.id);

  // join department room
  socket.on("joinDepartment", (dept) => {
    socket.join(dept);
    console.log(`User joined ${dept}`);
  });

  // 🔥 disconnect
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });

});
// debug email env
// console.log("EMAIL:", process.env.EMAIL_USER);
// console.log("PASS:", process.env.EMAIL_PASS);

// IMPORTANT: use server.listen NOT app.listen
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});