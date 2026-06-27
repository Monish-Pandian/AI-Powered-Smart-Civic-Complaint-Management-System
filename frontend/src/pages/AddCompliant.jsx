import { useState, useEffect } from "react";
import MainLayout from "../layouts/MainLayout";
import { createComplaint } from "../services/complaints";
import Toast from "../components/Toast";

export default function AddComplaint() {

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null
  });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔥 Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setToast({
        message: "Geolocation not supported ❌",
        type: "error"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      },
      (err) => {
        console.log(err);
        setToast({
          message: "Location access denied 📍",
          type: "error"
        });
      }
    );
  }, []);

  // 🔥 Submit complaint
  const handleSubmit = async (e) => {
    e.preventDefault();

    // validation
    if (!description.trim()) {
      setToast({
        message: "Description is required ❗",
        type: "error"
      });
      return;
    }

    if (!location.latitude || !location.longitude) {
      setToast({
        message: "Location required to submit 📍",
        type: "error"
      });
      return;
    }

    try {
      setLoading(true);

      await createComplaint({
        description,
        latitude: location.latitude,
        longitude: location.longitude
      });

      setToast({
        message: "Complaint submitted successfully ✅",
        type: "success"
      });

      setDescription("");

    } catch (err) {
      console.log(err);
      setToast({
        message: "Submission failed ❌",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>

      <div className="container mt-4">

        <h2 className="mb-4">Submit Complaint</h2>

        {/* 🔥 Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="card-ui p-4">

          {/* 🔥 Description */}
          <div className="mb-3">
            <label className="form-label">Describe your issue</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Example: Street light not working near my house..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 🔥 Location Status */}
          <div className="mb-3">
            <small>
              {location.latitude
                ? "📍 Location detected"
                : "📍 Detecting location..."}
            </small>
          </div>

          {/* 🔥 Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Complaint"}
          </button>

        </form>

      </div>

    </MainLayout>
  );
}