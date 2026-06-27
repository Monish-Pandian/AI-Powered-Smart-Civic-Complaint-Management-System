# 🚀 AI-Powered Smart Civic Complaint Management System

An AI-powered Smart Civic Complaint Management System built using the MERN Stack (MongoDB, Express.js, React.js, Node.js). The platform enables citizens to submit complaints, automatically routes them to government officers, tracks complaint status in real time, and provides analytical dashboards for administrators.

---

## 📌 Project Overview

Managing civic complaints manually often leads to delays, poor communication, and inefficient resource allocation. This project digitizes the complaint management process by providing a centralized platform for citizens, officers, and administrators.

The system supports:

* Citizen complaint registration
* Officer assignment
* Complaint tracking
* Real-time updates
* Analytics dashboard
* Role-based access control
* Responsive user interface

Future versions will integrate Artificial Intelligence to automate complaint classification, predict civic issues, and assist government departments in proactive decision-making.

---

# ✨ Current Features

## 👤 Authentication

* Secure Login System
* JWT Authentication
* Role-Based Access Control
* Admin Login
* Officer Login
* Citizen Login

---

## 📝 Complaint Management

* Create Complaint
* View Complaint Status
* Search Complaints
* Department Assignment
* Officer Assignment
* Priority Score Display
* Complaint Timeline
* Status Tracking
* Complaint Escalation

---

## 👮 Officer Management

* Add Officer
* Edit Officer
* Delete Officer
* Department Allocation
* Level-Based Officer Management

---

## 📊 Dashboard

### Admin Dashboard

* Total Complaints
* Pending Complaints
* Resolved Complaints
* Escalated Complaints

### Analytics

* Department-wise Complaint Distribution
* Complaint Status Analysis
* Officer Performance
* Recent Complaints

---

## ⚡ Real-Time Features

* Real-Time Complaint Creation
* Real-Time Status Updates
* Real-Time Complaint Deletion

Powered using **Socket.IO**.

---

## 📱 Responsive Design

* Responsive Dashboard
* Responsive Complaint Management
* Responsive Officer Management
* Mobile-Friendly Navigation

---

# 🛠 Tech Stack

### Frontend

* React.js
* React Router
* Bootstrap 5
* Axios
* Recharts
* Socket.IO Client

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Socket.IO

### Database

* MongoDB

---

# 📂 Project Structure

```
AI-Powered-Smart-Civic-Complaint-Management-System

├── client
│   ├── src
│   ├── public
│   └── package.json
│
├── server
│   ├── controllers
│   ├── routes
│   ├── models
│   ├── middleware
│   ├── services
│   └── package.json
│
├── README.md
└── .gitignore
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/AI-Powered-Smart-Civic-Complaint-Management-System.git
```

## Backend

```bash
cd server
npm install
npm start
```

## Frontend

```bash
cd client
npm install
npm run dev
```

---

# Environment Variables

Create a `.env` file inside the server folder.

```
PORT=5000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:5173
```

---

# Current Modules

* Authentication
* Complaint Management
* Officer Management
* Dashboard
* Analytics
* Real-Time Updates
* Responsive UI

---

# Author

**Monish Pandian**

B.Tech Information Technology

---

# License

This project is developed for educational, research, and smart-city innovation purposes.
