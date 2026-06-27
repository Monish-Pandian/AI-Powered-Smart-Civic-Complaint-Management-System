import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import { useNavigate } from "react-router-dom";

export default function CreateComplaint() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  const [loading, setLoading] = useState(false);

  // 📍 Location State
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    loading: true,
    error: null
  });

  // 📡 Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        lat: null,
        lng: null,
        loading: false,
        error: "Geolocation not supported"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null
        });
      },
      () => {
        setLocation({
          lat: null,
          lng: null,
          loading: false,
          error: "Location access denied"
        });
      }
    );
  }, []);

  // 🚀 Submit Complaint
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      let finalData = {
        description: formData.description
      };

      // 🧠 Optional title
      if (formData.title) {
        finalData.title = formData.title;
      }

      // ✅ Send correct fields for backend
      if (
        typeof location.lat === "number" &&
        typeof location.lng === "number"
      ) {
        finalData.latitude = location.lat;
        finalData.longitude = location.lng;
      }

      console.log("Sending:", finalData); // 🔍 debug

      await API.post("/complaints", finalData);

      setLoading(false);

      alert("Complaint submitted successfully ✅");

      navigate("/my-complaints");

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Error submitting complaint");
    }
  };

  return (
    <MainLayout>

      <div className="mb-4">
        <h3 className="gradient-text">Create Complaint</h3>
        <p className="text-muted small">
          Describe your issue clearly
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass p-4 fade-in"
        style={{
  maxWidth:"600px",
  width:"100%"
}}
      >

        {/* Title */}
        <div className="form-floating mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Title (optional)"
            value={formData.title}
            onChange={(e) =>
              setFormData({
                ...formData,
                title: e.target.value
              })
            }
          />
          <label>Title (optional)</label>
        </div>

        {/* Description */}
        <div className="form-floating mb-3">
          <textarea
            className="form-control"
            placeholder="Describe your issue..."
            style={{ height: "120px" }}
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({
                ...formData,
                description: e.target.value
              })
            }
          />
          <label>Description *</label>
        </div>

        {/* 📍 Location Status */}
        <div className="mb-3">

          {location.loading && (
            <small className="text-muted">
              📡 Detecting location...
            </small>
          )}

          {location.error && (
            <small className="text-danger">
              ❌ {location.error}
            </small>
          )}

          {location.lat && (
            <small className="text-success">
              📍 Location detected
            </small>
          )}

        </div>

        {/* Submit Button */}
        <button
          className="btn btn-custom w-100"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Complaint"}
        </button>

      </form>

    </MainLayout>
  );
}