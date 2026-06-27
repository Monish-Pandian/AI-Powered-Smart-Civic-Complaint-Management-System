import { useState, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./sidebar.css";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen
}) {
 const [open,setOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = user?.role;

  return (
   <div
  className={`sidebar ${
    sidebarOpen ? "mobile-open" : ""
  }`}
>
     <button
  className="close-sidebar"
  onClick={() =>
    setSidebarOpen(false)
  }
>
  ✕
</button>
      <ul className="menu">

        {/* ADMIN */}
        {role === "Admin" && (
          <>
            <li className={location.pathname === "/dashboard" ? "active" : ""}>
              <Link to="/dashboard">Dashboard</Link>
            </li>

            <li className={location.pathname === "/complaints" ? "active" : ""}>
              <Link to="/complaints">Complaints</Link>
            </li>
            <li>
              <Link to="/heatmap">Heatmap</Link>
            </li>
            <li
                className={
                  location.pathname === "/officers"
                    ? "active"
                    : ""
                }
              >
                <Link to="/officers">
                  Officers
                </Link>
              </li>
          </>
        )}

        {/* OFFICER */}
        {role === "Officer" && (
          <>
          <li className={location.pathname === "/complaints" ? "active" : ""}>
            <Link to="/complaints">Complaints</Link>
          </li>
          <li>
            <Link to="/heatmap">Heatmap</Link>
          </li>
          </>
        )}

        {/* USER */}
        {role === "User" && (
          <>
            <li className={location.pathname === "/my-complaints" ? "active" : ""}>
              <Link to="/my-complaints">My Complaints</Link>
            </li>

            <li className={location.pathname === "/create-complaint" ? "active" : ""}>
              <Link to="/create-complaint">New Complaint</Link>
            </li>
          </>
        )}

        {/* LOGOUT */}
        <li>
          <button
            className="btn btn-danger w-100 mt-3"
            onClick={handleLogout}
          >
            Logout
          </button>
        </li>

      </ul>

    </div>
  );
}