import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import socket from "../services/socket";
import { useSearchParams } from "react-router-dom"; 

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

const searchText =
  searchParams.get("search") || "";
  useEffect(() => {
    fetchMyComplaints();

    // 🔥 Live Status Updates
    socket.on("statusUpdated", (updatedComplaint) => {
      setComplaints((prev) =>
        prev.map((item) =>
          item._id === updatedComplaint._id
            ? updatedComplaint
            : item
        )
      );
    });

    return () => {
      socket.off("statusUpdated");
    };
  }, []);

  const fetchMyComplaints = async () => {
    try {
      const { data } = await API.get("/complaints/my");
      setComplaints(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Submitted":
        return "secondary";
      case "Assigned":
        return "primary";
      case "In Progress":
        return "warning";
      case "Resolved":
        return "success";
      case "Escalated":
        return "danger";
      default:
        return "dark";
    }
  };

  const getProgress = (status) => {
    switch (status) {
      case "Submitted":
        return 20;
      case "Assigned":
        return 45;
      case "In Progress":
        return 75;
      case "Resolved":
        return 100;
      case "Escalated":
        return 100;
      default:
        return 0;
    }
  };
  const filteredComplaints =
  complaints.filter((c) =>
    c.description
      ?.toLowerCase()
      .includes(searchText.toLowerCase())
  );
  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-4">
        <h3 className="gradient-text mb-1">
          My Complaints
        </h3>
        <small className="text-muted">
          Track your submitted complaints in real time
        </small>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="glass p-4 text-center">
          Loading complaints...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass p-4 text-center">
          <h5>No complaints yet 😶</h5>
          <p className="text-muted mb-0">
            Start by creating a new complaint
          </p>
        </div>
      ) : (
        <div className="row g-4">
        {filteredComplaints.map((c) => (
            <div
              key={c._id}
              className="col-md-6 fade-in"
            >
              <div className="glass p-4 h-100 hover-lift">

                {/* Complaint Title */}
                <h5 className="mb-2">
                  Complaint #{c._id.slice(-5)}
                </h5>

                {/* Description */}
                <p className="text-muted small mb-3">
                  {c.description}
                </p>

                {/* Status */}
                <div className="mb-2">
                  <span
                    className={`badge bg-${getStatusColor(
                      c.status
                    )}`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div
                    className="progress"
                    style={{ height: "8px" }}
                  >
                    <div
                      className={`progress-bar bg-${getStatusColor(
                        c.status
                      )}`}
                      style={{
                        width: `${getProgress(
                          c.status
                        )}%`
                      }}
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="mb-1">
                  <small className="text-muted">
                    Department:{" "}
                    {Array.isArray(c.department)
                      ? c.department.join(", ")
                      : c.department}
                  </small>
                </div>

                {/* Officer */}
                {c.officerName && (
                  <div className="mb-1">
                    <small className="text-muted">
                      Assigned Officer:{" "}
                      {c.officerName}
                    </small>
                  </div>
                )}

                {/* Priority */}
                <div className="mb-1">
                  <small className="text-muted">
                    Priority Score:{" "}
                    {c.priorityScore?.toFixed(2)}
                  </small>
                </div>

                {/* Created */}
                <div className="mb-1">
                  <small className="text-muted">
                    Created:{" "}
                    {new Date(
                      c.createdAt
                    ).toLocaleString()}
                  </small>
                </div>

                {/* Deadline */}
                {c.deadline && (
                  <div className="mt-2">
                    <small className="text-danger">
                      Deadline:{" "}
                      {new Date(
                        c.deadline
                      ).toLocaleString()}
                    </small>
                  </div>
                )}

                {/* Timeline */}
                {c.statusLogs?.length > 0 && (
                  <div className="mt-3">
                    <small className="fw-bold">
                      Timeline
                    </small>

                    <ul className="small mt-2 ps-3 mb-0">
                      {c.statusLogs.map(
                        (log, index) => (
                          <li key={index}>
                            {log.status} —{" "}
                            {new Date(
                              log.updatedAt
                            ).toLocaleString()}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}