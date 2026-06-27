import {
  useContext,
  useState,
  useEffect
} from "react";

import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";

import "./navbar.css";

export default function Navbar({
  setSidebarOpen
}) {
  const { user, logout } =
    useContext(AuthContext);

  const navigate = useNavigate();

  const [search, setSearch] =
    useState("");

  const [notifications, setNotifications] =
    useState([]);

  const [showSearch, setShowSearch] =
    useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications =
    async () => {
      try {
        const { data } =
          await API.get(
            "/notifications"
          );

        setNotifications(data);

      } catch (err) {
        console.error(err);
      }
    };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearch = (e) => {
    if (e.key !== "Enter") return;

    const query = search.trim();

    if (!query) return;

    if (
      user?.role === "Admin" ||
      user?.role === "Officer"
    ) {
      navigate(
        `/complaints?search=${query}`
      );
    } else {
      navigate(
        `/my-complaints?search=${query}`
      );
    }
  };

  return (
    <>
      <div
        className="
        glass
        d-flex
        justify-content-between
        align-items-center
        p-3
        mb-4
        shadow-sm
        "
      >

        {/* MOBILE NAVBAR */}

        <div className="mobile-navbar">

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            ☰
          </button>

          <button
            onClick={() =>
              setShowSearch(
                !showSearch
              )
            }
          >
            🔍
          </button>

          <div className="dropdown position-relative">

            <button
              data-bs-toggle="dropdown"
              className="mobile-icon-btn"
            >
              🔔

              {notifications.length >
                0 && (
                <span
                  className="
                  badge
                  rounded-pill
                  bg-danger
                  notification-badge
                  "
                >
                  {
                    notifications.length
                  }
                </span>
              )}
            </button>

            <ul
              className="
              dropdown-menu
              dropdown-menu-end
              "
            >
              {notifications.length ===
              0 ? (
                <li>
                  <span className="dropdown-item">
                    No Notifications
                  </span>
                </li>
              ) : (
                notifications
                  .slice(0, 5)
                  .map((n) => (
                    <li
                      key={n._id}
                    >
                      <div className="dropdown-item">
                        {n.status}
                      </div>
                    </li>
                  ))
              )}
            </ul>

          </div>

          <div className="dropdown">

            <button
              data-bs-toggle="dropdown"
              className="mobile-icon-btn"
            >
              👤
            </button>

            <ul
              className="
              dropdown-menu
              dropdown-menu-end
              "
            >
              <li>
                <div className="dropdown-item-text">
                  {user?.name}
                </div>
              </li>

              <li>
                <div className="dropdown-item-text">
                  {user?.email}
                </div>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  className="dropdown-item"
                  onClick={
                    handleLogout
                  }
                >
                  Logout
                </button>
              </li>
            </ul>

          </div>

        </div>

        {/* DESKTOP SEARCH */}

        <div
          className="navbar-search"
          style={{ width: "50%" }}
        >
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search complaints..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            onKeyDown={
              handleSearch
            }
          />
        </div>

        {/* DESKTOP RIGHT */}

        <div
          className="
          desktop-navbar
          d-flex
          align-items-center
          gap-3
          "
        >

          <div className="dropdown position-relative">

            <button
              className="
              btn btn-light
              position-relative
              "
              data-bs-toggle="dropdown"
            >
              🔔

              {notifications.length >
                0 && (
                <span
                  className="
                  position-absolute
                  top-0
                  start-100
                  translate-middle
                  badge
                  rounded-pill
                  bg-danger
                  "
                >
                  {
                    notifications.length
                  }
                </span>
              )}
            </button>
            
  <ul
    className="
    dropdown-menu
    dropdown-menu-end
    notification-dropdown
    shadow-lg
    "
  >
    <li>
      <h6 className="dropdown-header">
        Notifications ({notifications.length})
      </h6>
    </li>

    <li><hr className="dropdown-divider" /></li>

    {notifications.length === 0 ? (
      <li>
        <span className="dropdown-item">
          No Notifications
        </span>
      </li>
    ) : (
      <>
        {notifications.slice(0, 5).map((n) => (
          <li key={n._id}>
            <div className="dropdown-item notification-item">

              <span
                className={`badge ${
                  n.status === "Escalated"
                    ? "bg-danger"
                    : n.status === "Resolved"
                    ? "bg-success"
                    : "bg-warning text-dark"
                }`}
              >
                {n.status}
              </span>

              <div className="mt-2">
                <small>
                  Department:
                  {" "}
                  {Array.isArray(n.department)
                    ? n.department.join(", ")
                    : n.department || "General"}
                </small>
              </div>

              <small className="text-muted d-block mt-1">
                {new Date(
                  n.updatedAt
                ).toLocaleString()}
              </small>
            </div>
          </li>
        ))}

        {notifications.length > 5 && (
          <>
            <li>
              <hr className="dropdown-divider" />
            </li>

            <li>
              <button
                className="
                dropdown-item
                text-center
                fw-bold
                text-primary
                "
              >
                View All Notifications
              </button>
            </li>
          </>
        )}
      </>
    )}
  </ul>
          </div>

          <div className="dropdown">

            <button
              className="
              btn btn-light
              dropdown-toggle
              "
              data-bs-toggle="dropdown"
            >
              👤 {user?.name}
            </button>

            <ul
              className="
              dropdown-menu
              dropdown-menu-end
              "
            >
              <li>
                <div className="dropdown-item-text">
                  <strong>
                    Name:
                  </strong>{" "}
                  {user?.name}
                </div>
              </li>

              <li>
                <div className="dropdown-item-text">
                  <strong>
                    Email:
                  </strong>{" "}
                  {user?.email}
                </div>
              </li>

              <li>
                <div className="dropdown-item-text">
                  <strong>
                    Role:
                  </strong>{" "}
                  {user?.role}
                </div>
              </li>

              <li>
                <hr className="dropdown-divider" />
              </li>

              <li>
                <button
                  className="dropdown-item"
                  onClick={
                    handleLogout
                  }
                >
                  Logout
                </button>
              </li>
            </ul>

          </div>

        </div>

      </div>

      {/* MOBILE SEARCH */}

      {showSearch && (
        <div className="mobile-search mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search complaints..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            onKeyDown={
              handleSearch
            }
          />
        </div>
      )}
    </>
  );
}