import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/auth";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await registerUser(formData);

      alert("Registered successfully");
      navigate("/login");

    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center fade-in">

      <form
        onSubmit={handleRegister}
        className="glass p-4 hover-lift"
        style={{ width: "350px" }}
      >
        <h3 className="text-center mb-3 gradient-text">Register</h3>

        <input
          className="form-control mb-3"
          placeholder="Name"
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />

        <input
          className="form-control mb-3"
          placeholder="Email"
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />

        <div className="position-relative mb-3">
          <input
            type={showPassword ? "text" : "password"}
            className="form-control"
            placeholder="Password"
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />

          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "8px",
              cursor: "pointer"
            }}
          >
            👁
          </span>
        </div>

        <button className="btn btn-custom w-100">
          Register
        </button>

        <p className="text-center mt-3">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </form>

    </div>
  );
}