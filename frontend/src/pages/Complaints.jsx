import { useEffect, useState, useContext } from "react";
import {
  useNavigate,
  useSearchParams
} from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import socket from "../services/socket";
import { AuthContext } from "../context/AuthContext";

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMobile, setIsMobile] =
  useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => {
    setIsMobile(
      window.innerWidth < 768
    );
  };

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
const searchText =
  searchParams.get("search") || "";
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchComplaints();

    // 🟢 New complaint
    socket.on("newComplaint", (newData) => {
      setComplaints((prev) => [newData, ...prev]);
    });

    // 🟡 Update complaint
    socket.on("updateComplaint", (updated) => {
      setComplaints((prev) =>
        prev.map((c) => (c._id === updated._id ? updated : c))
      );
    });

    // 🔴 Delete complaint
    socket.on("deleteComplaint", (id) => {
      setComplaints((prev) => prev.filter((c) => c._id !== id));
    });

    return () => {
      socket.off("newComplaint");
      socket.off("updateComplaint");
      socket.off("deleteComplaint");
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await API.get("/complaints");
      setComplaints(data);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComplaint = async (id) => {
    try {
      await API.delete(`/complaints/${id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const updateComplaintStatus = async (id, status) => {
    try {
      await API.patch(`/complaints/${id}/status`, { status });

      // ❌ Removed refetch (socket will handle update)
    } catch (err) {
      console.error(err);
    }
  };

  const canCreate =
    user?.role === "Admin" || user?.role === "User";
  const filteredComplaints = complaints.filter((c) => {
  const search = searchText.toLowerCase();

  return (
    c.description
      ?.toLowerCase()
      .includes(search) ||

    c.status
      ?.toLowerCase()
      .includes(search) ||

    c.officerName
      ?.toLowerCase()
      .includes(search) ||

    (
      Array.isArray(c.department)
        ? c.department.join(" ")
        : c.department || ""
    )
      .toLowerCase()
      .includes(search)
  );
});
  return (
    <MainLayout>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="gradient-text mb-1">Complaints</h3>
          <small className="text-muted">
            Manage and track all complaints
          </small>
        </div>

        {canCreate && (
          <button
            className="btn btn-custom px-4"
            onClick={() => navigate("/create-complaint")}
          >
            + New Complaint
          </button>
        )}
      </div>



{isMobile ? 

  // Mobile Cards

  (

  filteredComplaints.length === 0 ? (

    <div className="glass p-4 text-center">
      <h6>No complaints found 🚀</h6>
      <p className="text-muted mb-0">
        Submit a complaint to get started
      </p>
    </div>

  ) :<div className="row g-3">

    {filteredComplaints.map((c) => (

      <div
        key={c._id}
        className="col-12"
      >
        <div className="glass p-3">

          <h6 className="fw-bold">
            {c.description?.slice(0, 50)}
          </h6>
           {c.location?.coordinates && (
                        <div className="small text-muted">
                          📍 {c.location.coordinates[1]?.toFixed(4)},{" "}
                          {c.location.coordinates[0]?.toFixed(4)}
                        </div>
                      )}
          <div className="small text-muted">
            👤 {c.officerName || "Unassigned"}
          </div>

          <div className="small text-muted">
            🏢 {Array.isArray(c.department)
              ? c.department.join(", ")
              : c.department}
          </div>

          <div className="mt-2">
            <span
              className={`badge ${
                c.status === "Resolved"
                  ? "bg-success"
                  : c.status === "In Progress"
                  ? "bg-info"
                  : c.status === "Assigned"
                  ? "bg-primary"
                  : "bg-warning text-dark"
              }`}
            >
              {c.status}
            </span>
          </div>

          <div className="mt-2">
            Priority:
            {" "}
            {(c.priorityScore || 0).toFixed(2)}
          </div>

          <div className="mt-3">

            {c.status === "Assigned" && (
              <button
                className="btn btn-warning btn-sm me-2"
                onClick={() =>
                  updateComplaintStatus(
                    c._id,
                    "In Progress"
                  )
                }
              >
                Start
              </button>
            )}

            {c.status === "In Progress" && (
              <button
                className="btn btn-success btn-sm"
                onClick={() =>
                  updateComplaintStatus(
                    c._id,
                    "Resolved"
                  )
                }
              >
                Resolve
              </button>
            )}

          </div>

        </div>
      </div>

    ))}

  </div>

) : (
    
      <div className="glass p-4 shadow-sm rounded-4">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>Status</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredComplaints.length === 0 ?  (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <h6>No complaints found 🚀</h6>
                    <p className="text-muted mb-0">
                      Submit a complaint to get started
                    </p>
                  </td>
                </tr>
              ) : 
              (
                filteredComplaints.map((c, index) => (
                  <tr key={c._id} className="hover-lift">
                    {/* Index */}
                    <td>{index + 1}</td>

                    {/* Description */}
                    <td style={{ minWidth: "300px" }}>
                      <strong>
                        {c.description?.slice(0, 55) ||
                          "No Description"}
                      </strong>

                      {/* Location */}
                      {c.location?.coordinates && (
                        <div className="small text-muted mt-1">
                          📍 {c.location.coordinates[1]?.toFixed(4)},{" "}
                          {c.location.coordinates[0]?.toFixed(4)}
                        </div>
                      )}

                      {/* Officer */}
                      <div className="small text-muted mt-1">
                        👤 {c.officerName || "Unassigned"} (
                        L{c.assignedLevel ?? "-"})
                      </div>

                      {/* Escalation */}
                      {c.escalationLevel > 0 && (
                        <div className="small text-danger">
                          ⚠ Escalated {c.escalationLevel} time(s)
                        </div>
                      )}

                      {/* Deadline */}
                      {c.deadline && (
                        <div className="small text-warning mt-1">
                          ⏱{" "}
                          {new Date(
                            c.deadline
                          ).toLocaleTimeString()}
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="mt-2">
                        {c.statusLogs?.map((log, i) => (
                          <div key={i} className="small text-muted">
                            • {log.status} —{" "}
                            {new Date(
                              log.updatedAt
                            ).toLocaleTimeString()}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`badge ${
                          c.status === "Resolved"
                            ? "bg-success"
                            : c.status === "In Progress"
                            ? "bg-info"
                            : c.status === "Assigned"
                            ? "bg-primary"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    {/* Department */}
                    <td>
                      <span className="fw-semibold text-primary">
                        {Array.isArray(c.department)
                          ? c.department.join(", ")
                          : c.department}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: "70px",
                            height: "7px",
                            background: "#e5e7eb",
                            borderRadius: "10px",
                            overflow: "hidden"
                          }}
                        >
                          <div
                            style={{
                              width: `${
                                (c.priorityScore || 0) * 100
                              }%`,
                              height: "100%",
                              background:
                                c.priorityScore > 0.7
                                  ? "#ef4444"
                                  : c.priorityScore > 0.4
                                  ? "#f59e0b"
                                  : "#10b981"
                            }}
                          />
                        </div>

                        <small>
                          {(c.priorityScore || 0).toFixed(2)}
                        </small>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      {/* 🔐 Only Admin OR Assigned Officer */}
                      {(user?.role === "Admin" ||
                        user?.email === c.officerEmail) && (
                        <>
                          {c.status === "Assigned" && (
                            <button
                              className="btn btn-sm btn-warning me-2"
                              onClick={() =>
                                updateComplaintStatus(
                                  c._id,
                                  "In Progress"
                                )
                              }
                            >
                              Start
                            </button>
                          )}

                          {c.status === "In Progress" && (
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={() =>
                                updateComplaintStatus(
                                  c._id,
                                  "Resolved"
                                )
                              }
                            >
                              Resolve
                            </button>
                          )}
                        </>
                      )}

                      {/* Completed */}
                      {c.status === "Resolved" && (
                        <span className="text-success fw-bold me-2">
                          Completed
                        </span>
                      )}

                      {/* Admin delete */}
                      {user?.role === "Admin" && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            deleteComplaint(c._id)
                          }
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>)}
    </MainLayout>
  )}
