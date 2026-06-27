import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
export default function Officers() {
  const [officers, setOfficers] = useState([]);
  const navigate = useNavigate();
  const [isMobile, setIsMobile] =
  useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  window.addEventListener(
    "resize",
    handleResize
  );

  return () =>
    window.removeEventListener(
      "resize",
      handleResize
    );
}, []);
  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const { data } = await API.get("/officers");
      setOfficers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteOfficer = async (id) => {
    try {
      await API.delete(`/officers/${id}`);

      setOfficers((prev) =>
        prev.filter((o) => o._id !== id)
      );

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="gradient-text">
          Officer Management
        </h3>

       <button
                        className="btn btn-primary"
                        onClick={() => navigate("/officers/create")}
                        >
                        + Add Officer
                        </button>
      </div>

     {isMobile ? (

  <div className="row g-3">

    {officers.length === 0 ? (
      <div className="col-12">
        <div className="glass p-4 text-center">
          No officers found
        </div>
      </div>
    ) : (

      officers.map((o) => (

        <div
          key={o._id}
          className="col-12"
        >
          <div className="glass p-3">

            <h5 className="fw-bold mb-2">
              {o.name}
            </h5>

            <div className="mb-2">
              📧 {o.email}
            </div>

            <div className="mb-2">
              🏢 {o.department}
            </div>

            <div className="mb-3">
              <span className="badge bg-primary">
                Level {o.level}
              </span>
            </div>

            <div className="d-flex gap-2">

              <button
                className="btn btn-warning btn-sm flex-fill"
                onClick={() =>
                  navigate(
                    `/officers/edit/${o._id}`
                  )
                }
              >
                Edit
              </button>

              <button
                className="btn btn-danger btn-sm flex-fill"
                onClick={() =>
                  deleteOfficer(o._id)
                }
              >
                Delete
              </button>

            </div>

          </div>
        </div>

      ))

    )}

  </div>

) : (

  <div className="glass p-4">

    <div className="table-responsive">

      <table className="table align-middle">

        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Level</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {officers.map((o) => (
            <tr key={o._id}>

              <td>{o.name}</td>

              <td>{o.email}</td>

              <td>{o.department}</td>

              <td>
                <span className="badge bg-primary">
                  L{o.level}
                </span>
              </td>

              <td>

                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() =>
                    navigate(
                      `/officers/edit/${o._id}`
                    )
                  }
                >
                  Edit
                </button>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    deleteOfficer(o._id)
                  }
                >
                  Delete
                </button>

              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>

    {officers.length === 0 && (
      <div className="text-center py-4">
        No officers found
      </div>
    )}

  </div>

)}
    </MainLayout>
  );
}