import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import API from "../services/api";

export default function EditOfficer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    level: 1
  });

  useEffect(() => {
    fetchOfficer();
  }, []);

  const fetchOfficer = async () => {
    try {
      const { data } =
        await API.get(`/officers/${id}`);

      setForm({
        name: data.name,
        email: data.email,
        department: data.department,
        level: data.level
      });

    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.put(
        `/officers/${id}`,
        {
          ...form,
          level: Number(form.level)
        }
      );

      alert("Officer updated");

      navigate("/officers");

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <MainLayout>
      <div className="glass p-4">
        <h3>Edit Officer</h3>

        <form onSubmit={handleSubmit}>

          <div className="mb-3">
            <label>Name</label>
            <input
              className="form-control"
              name="name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label>Email</label>
            <input
              className="form-control"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label>Department</label>
            <input
              className="form-control"
              name="department"
              value={form.department}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label>Level</label>
            <input
              type="number"
              className="form-control"
              name="level"
              value={form.level}
              onChange={handleChange}
            />
          </div>

          <button
            className="btn btn-success"
            type="submit"
          >
            Update Officer
          </button>

        </form>
      </div>
    </MainLayout>
  );
}