import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { loginUser } from "../services/auth";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data } = await loginUser(formData);

      if (!data.token) {
        alert("Invalid login");
        setLoading(false);
        return;
      }

      const decoded = jwtDecode(data.token);

      const realUser = {
  name: decoded.name,
  email: formData.email,
  role: decoded.role,
  department: decoded.department
};

      login({
        token: data.token,
        user: realUser
      });

      // Role Redirect
      if (realUser.role === "Admin") {
        navigate("/dashboard");
      } else if (realUser.role === "Officer") {
        navigate("/complaints");
      } else {
        navigate("/my-complaints");
      }

    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center fade-in">

      <form
        onSubmit={handleLogin}
        className="glass p-4 hover-lift"
        style={{ width: "360px" }}
      >
        <h3 className="text-center mb-4 gradient-text">
          Login
        </h3>

        <input
          type="email"
          className="form-control mb-3"
          placeholder="Email"
          required
          value={formData.email}
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value
            })
          }
        />

        <div className="position-relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            className="form-control"
            placeholder="Password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value
              })
            }
          />

          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "12px",
              top: "9px",
              cursor: "pointer"
            }}
          >
            👁
          </span>
        </div>

        <button
          className="btn btn-custom w-100"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-center mt-3 mb-0">
          Don’t have an account?{" "}
          <Link to="/register">Register</Link>
        </p>

      </form>

    </div>
  );
}