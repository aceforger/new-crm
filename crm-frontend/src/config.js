const host = window.location.hostname;
const API_URL =
  host === "localhost"
    ? import.meta.env.VITE_API_URL
    : `http://${host}:5000/api`;

export { API_URL };
