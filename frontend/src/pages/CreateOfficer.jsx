import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import Select from "react-select";
import API from "../services/api";

export default function CreateOfficer() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    level: 1,
    latitude: "",
    longitude: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/officers", {
        ...form,
        level: Number(form.level),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude)
      });

      alert("Officer created successfully");

      navigate("/officers");

    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
        "Failed to create officer"
      );
    }
  };
  
  return (
    <MainLayout>
      <div
  className="glass p-4 mx-auto"
  style={{
    maxWidth: "700px"
  }}
>
        <h3 className="mb-4">
          Create Officer
        </h3>

        <form onSubmit={handleSubmit}>

          <div className="mb-3">
            <label>Name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label>Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label>Department</label>
          <Select
  options={[
    { value: "Municipal", label: "Municipal" },
    { value: "Electricity", label: "Electricity" },
    { value: "Water", label: "Water" }
  ]}
/>
          </div>

          <div className="mb-3">
            <label>Level</label>
            <input
              type="number"
              name="level"
              className="form-control"
              min="1"
              value={form.level}
              onChange={handleChange}
              required
            />
          </div>

          <div className="row">

  <div className="col-md-6 mb-3">
    <label>Latitude</label>
    <input
      type="number"
      step="any"
      name="latitude"
      className="form-control"
      value={form.latitude}
      onChange={handleChange}
      required
    />
  </div>

  <div className="col-md-6 mb-3">
    <label>Longitude</label>
    <input
      type="number"
      step="any"
      name="longitude"
      className="form-control"
      value={form.longitude}
      onChange={handleChange}
      required
    />
  </div>

</div>

          <button
            type="submit"
            className="btn btn-success w-100"
          >
            Create Officer
          </button>

        </form>
      </div>
    </MainLayout>
  );
}