import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
export default function ProtectedRoute({
  children,
  role,
  roles = []
}) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const allowedRoles =
    role
      ? Array.isArray(role)
        ? role
        : [role]
      : roles;

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    if (user.role === "Admin")
      return <Navigate to="/dashboard" />;

    if (user.role === "Officer")
      return <Navigate to="/complaints" />;

    return <Navigate to="/my-complaints" />;
  }

  return children;
}