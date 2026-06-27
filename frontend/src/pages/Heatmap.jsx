import { useEffect, useState, useContext } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Popup
} from "react-leaflet";

import API from "../services/api";
import MainLayout from "../layouts/MainLayout";
import { AuthContext } from "../context/AuthContext";

export default function Heatmap() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      fetchHeatmap();
    }
  }, [user]);

  const fetchHeatmap = async () => {
    try {
      setLoading(true);

      let url = "/complaints/heatmap";

      
      

      console.log("Heatmap URL:", url);
      console.log("User:", user);

      const { data } = await API.get(url);

      setPoints(data || []);
    } catch (err) {
      console.error("Heatmap Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (count) => {
    if (count >= 20) return "#7f0000";
    if (count >= 15) return "#d73027";
    if (count >= 10) return "#fc8d59";
    if (count >= 5) return "#fee08b";
    return "#91cf60";
  };

  const getRadius = (count) => {
    return Math.max(100, count * 200);
  };

  return (
    <MainLayout>
      <div className="mb-4">
        <h3 className="gradient-text">
          Complaint Heatmap
        </h3>

        <small className="text-muted">
          {user?.role === "Admin"
            ? "All Departments"
            : user?.department
            ? `${user.department} Department`
            : "Department Not Found"}
        </small>
      </div>

      <div className="glass p-3 mb-3">
        <h6>Complaint Density</h6>

        <div className="d-flex flex-wrap gap-3">
          <span>🟢 1 - 4</span>
          <span>🟡 5 - 9</span>
          <span>🟠 10 - 14</span>
          <span>🔴 15 - 19</span>
          <span>🟥 20+</span>
        </div>
      </div>

      <div className="glass p-3">
        {loading ? (
          <div className="text-center py-5">
            Loading Heatmap...
          </div>
        ) : (
          <MapContainer
            center={[9.9252, 78.1198]}
            zoom={13}
            style={{
              height: "600px",
              width: "100%",
              borderRadius: "12px"
            }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {points.map((p, i) => (
              <Circle
                key={i}
                center={[
                  p._id.lat,
                  p._id.lng
                ]}
                radius={getRadius(p.count)}
                pathOptions={{
                  color: getColor(p.count),
                  fillColor: getColor(p.count),
                  fillOpacity: 0.65,
                  weight: 2
                }}
              >
                <Popup>
                  <div>
                    <h6>
                      Complaint Cluster
                    </h6>

                    <strong>
                      Total Complaints:
                      {" "}
                      {p.count}
                    </strong>

                    <br />

                    Latitude:
                    {" "}
                    {p._id.lat}

                    <br />

                    Longitude:
                    {" "}
                    {p._id.lng}
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        )}
      </div>
    </MainLayout>
  );
}