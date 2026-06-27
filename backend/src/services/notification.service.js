import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";

// console.log("EMAIL:", process.env.EMAIL_USER);
// console.log("PASS:", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER?.trim(),
    pass: process.env.EMAIL_PASS?.trim()
  }
});


transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP ERROR:", error);
  } else {
    console.log("✅ SMTP READY");
  }
});

// 📧 Send email function
export const sendEscalationEmail = async (complaint) => {
  try {
    console.log("📤 Sending email...");

    await transporter.sendMail({
      from: `"Smart Civic AI" <${process.env.EMAIL_USER}>`,

      // fallback to your own email if officerEmail not set
      to: complaint.officerEmail || process.env.EMAIL_USER,

      subject: "🚨 Complaint Escalated",

      text: `
Complaint ID: ${complaint._id}

Department: ${complaint.department}

Priority Score: ${complaint.priorityScore}

Escalation Level: ${complaint.escalationLevel}

Status: ${complaint.status}

Please take immediate action.
      `,

      html: `
        <h2>🚨 Complaint Escalated</h2>
        <p><strong>ID:</strong> ${complaint._id}</p>
        <p><strong>Department:</strong> ${complaint.department}</p>
        <p><strong>Priority:</strong> ${complaint.priorityScore}</p>
        <p><strong>Escalation Level:</strong> ${complaint.escalationLevel}</p>
        <p><strong>Status:</strong> ${complaint.status}</p>
        <p style="color:red;">Immediate action required</p>
      `
    });

    console.log(`📧 Email sent for complaint ${complaint._id}`);

  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
  }
};
// 2020-01-01T00:00:00Z
export const sendStatusEmail = async (complaint) => {

 try {

  if (!complaint.citizenEmail) return;

  await transporter.sendMail({
   from: `"Civic AI System" <${process.env.EMAIL_USER}>`,
   to: complaint.citizenEmail,

   subject: `Complaint Update: ${complaint.status}`,

   html: `
     <h2>📢 Complaint Update</h2>
     <p><strong>ID:</strong> ${complaint._id}</p>
     <p><strong>Status:</strong> ${complaint.status}</p>
     <p><strong>Department:</strong> ${complaint.department}</p>
     <p><strong>Priority:</strong> ${complaint.priorityScore}</p>
     <p>Thank you for reporting. We are working on it.</p>
   `
  });

  console.log("📧 Citizen notified");

 } catch (error) {
  console.error("Email failed:", error.message);
 }

};