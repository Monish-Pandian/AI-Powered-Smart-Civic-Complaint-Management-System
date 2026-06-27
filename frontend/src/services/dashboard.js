import axios from "axios";

const API = "http://localhost:5000/api";

export const getStats = async () => {
  const token = localStorage.getItem("token");

  return axios.get(`${API}/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};