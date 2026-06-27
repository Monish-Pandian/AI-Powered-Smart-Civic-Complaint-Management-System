import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center">

      <div className="text-center fade-in">

        <h1 className="gradient-text display-4 fw-bold">
          Civic AI System
        </h1>

        <p className="mt-3 text-muted">
          Smart complaint management powered by AI & real-time tracking
        </p>

        <div className="mt-4 d-flex gap-3 justify-content-center">

          <Link to="/login" className="btn btn-custom hover-lift">
            Login
          </Link>

          <Link to="/register" className="btn btn-outline-dark hover-lift">
            Register
          </Link>

        </div>

      </div>

    </div>
  );
}