import { useEffect, useState, useContext } from "react";
import MainLayout from "../layouts/MainLayout";
import StatCard from "../components/common/StatCard";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";
import useCountUp from "../hooks/useCountUp";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

export default function Dashboard() {
 const { user } = useContext(AuthContext);

const [stats, setStats] = useState({});
const [departments, setDepartments] = useState([]);
const [statusData, setStatusData] = useState([]);
const [officers, setOfficers] = useState([]);
const [recentComplaints, setRecentComplaints] =
  useState([]);
const [isMobile, setIsMobile] = useState(
  window.innerWidth < 768
);

useEffect(() => {
  const handleResize = () =>
    setIsMobile(window.innerWidth < 768);

  window.addEventListener(
    "resize",
    handleResize
  );

  return () =>
    window.removeEventListener(
      "resize",
      handleResize
    );
}, []);
useEffect(() => {
  fetchDashboard();
}, []);

const fetchDashboard = async () => {
  try {
    const [
      statsRes,
      deptRes,
      statusRes,
      officerRes,
      complaintRes
    ] = await Promise.all([
      API.get("/dashboard/stats"),
      API.get("/dashboard/departments"),
      API.get("/dashboard/status"),
      API.get("/dashboard/officers"),
      API.get("/complaints")
    ]);

    setStats(statsRes.data);
    setDepartments(deptRes.data);
    setStatusData(statusRes.data);
    setOfficers(officerRes.data);

    setRecentComplaints(
      complaintRes.data.slice(0, 5)
    );

  } catch (err) {
    console.error(err);
  }
};

const total = useCountUp(stats.total || 0);
const pending = useCountUp(stats.pending || 0);
const resolved = useCountUp(stats.resolved || 0);
const escalated = useCountUp(stats.escalated || 0);

const COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444"
];

  return (
    <MainLayout>

      {/* HEADER */}
      <div className="mb-4">
      <h2
  className="fw-bold"
  style={{
    fontSize:
      isMobile
        ? "1.5rem"
        : "2rem"
  }}
>
          Welcome Back, {user?.name}
        </h2>
        <p className="text-muted">
          Smart Complaint Monitoring Dashboard
        </p>
      </div>

      {/* CARDS */}
      <div className="row g-4 mb-4">

       <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Total Complaints"
            value={total}
            color={["#4f46e5", "#6366f1"]}
          />
        </div>

       <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Pending"
            value={pending}
            color={["#f59e0b", "#f97316"]}
          />
        </div>

       <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Resolved"
            value={resolved}
            color={["#10b981", "#22c55e"]}
          />
        </div>

       <div className="col-12 col-sm-6 col-lg-3">
          <StatCard
            title="Escalated"
            value={escalated}
            color={["#ef4444", "#dc2626"]}
          />
        </div>

      </div>

      {/* CHARTS */}
      <div className="row g-4 mb-4">

        <div className="col-lg-6">

          <div className="glass p-4 h-100">

            <h5>
              Complaints by Department
            </h5>

            <ResponsiveContainer
              width="100%"
              height={350}
            >
              <PieChart>

                <Pie
                  data={departments}
                  dataKey="count"
                  nameKey="_id"
                  outerRadius={120}
                  label
                >
                  {departments.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />
                <Legend />

              </PieChart>
            </ResponsiveContainer>

          </div>

        </div>

        <div className="col-lg-6">

          <div className="glass p-4 h-100">

            <h5>
              Complaint Status
            </h5>

            <ResponsiveContainer
              width="100%"
             height={isMobile ? 250 : 350}
            >
              <BarChart
                data={statusData}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="_id" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="count"
                  fill="#4f46e5"
                />

              </BarChart>
            </ResponsiveContainer>

          </div>

        </div>

      </div>

      {/* OFFICERS */}
     <div className="glass p-4 mb-4">
  <h5>Officer Performance</h5>

  {isMobile ? (

        <div className="row g-3">

  {officers.map((o, i) => (

    <div
      className="col-12"
      key={i}
    >
      <div className="glass p-3">

        <h6>{o._id?.name}</h6>

        <div>
          Assigned:
          {o.totalAssigned}
        </div>

        <div>
          Resolved:
          {o.resolved}
        </div>

        <div>
          Pending:
          {o.pending}
        </div>

        <div className="mt-2">
          Efficiency:
          {o.efficiency}%
        </div>

        <div
          className="progress mt-2"
        >
          <div
            className="progress-bar"
            style={{
              width:
                `${o.efficiency}%`
            }}
          />
        </div>

      </div>
    </div>

  ))}

</div> ) : (

        <table className="table table-hover">

          <thead>
            <tr>
              <th>Name</th>
              <th>Assigned</th>
              <th>Resolved</th>
              <th>Pending</th>
              <th>Efficiency</th>
            </tr>
          </thead>

          <tbody>

            {officers.map((o, i) => (

              <tr key={i}>

                <td>
                  {o._id?.name}
                </td>

                <td>
                  {o.totalAssigned}
                </td>

                <td>
                  {o.resolved}
                </td>

                <td>
                  {o.pending}
                </td>

                <td>

                  <div
                    className="progress"
                    style={{
                      height: "20px"
                    }}
                  >
                    <div
                      className="progress-bar"
                      style={{
                        width: `${o.efficiency}%`
                      }}
                    >
                      {o.efficiency}%
                    </div>
                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>
)}
      </div>

      {/* RECENT COMPLAINTS */}
 <div className="glass p-4">

<h5>Recent Complaints</h5>

{isMobile ? (
  <div className="row g-3">

  {recentComplaints.map((c) => (

    <div
      key={c._id}
      className="col-12"
    >
      <div className="glass p-3">

        <h6>
          {c.title}
        </h6>

        <div>
          Status:
          {c.status}
        </div>

        <div>
          Department:
          {c.department}
        </div>

      </div>
    </div>

  ))}

</div> ) : (

        <table className="table">

          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Department</th>
            </tr>
          </thead>

          <tbody>

            {recentComplaints.map(
              (c) => (
                <tr key={c._id}>
                  <td>{c.title}</td>

                  <td>
                    {c.status}
                  </td>

                  <td>
                    {c.department}
                  </td>
                </tr>
              )
            )}

          </tbody>

        </table>
)}
      </div>

    </MainLayout>
  );
}