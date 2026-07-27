import { useState, useEffect } from "react";
import axios from "axios";
import LeadsManager from "../components/LeadsManager";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_URL } from "../config";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const setActiveTab = (tab) => {
    setSearchParams({ tab });
  };
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalLeads: 0,
    activeLeads: 0,
    closedLeads: 0,
  });
  const [agents, setAgents] = useState([]);
  // const API_URL = import.meta.env.VITE_API_URL;

  const [showAddAgent, setShowAddAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    email: "",
    password: "",
    role: "opener",
  });
  const [agentError, setAgentError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activities, setActivities] = useState([]);

  const [showEditAgent, setShowEditAgent] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [editAgentForm, setEditAgentForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "opener",
    status: "active",
  });
  const [editAgentError, setEditAgentError] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    const userData = JSON.parse(stored);
    if (userData.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    setUser(userData);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API_URL}/agents/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStats(res.data))
      .catch(() => {});

    axios
      .get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAgents(res.data))
      .catch(() => {});

    axios
      .get(`${API_URL}/agents/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setActivities(res.data))
      .catch(() => {});
  }, []);

  const handleAddAgent = async (e) => {
    e.preventDefault();
    setAgentError("");

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/auth/create-agent`, newAgent, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowAddAgent(false);
      setNewAgent({ name: "", email: "", password: "", role: "opener" });

      // Refresh agents
      const agentsRes = await axios.get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(agentsRes.data);

      // Refresh activity
      const activityRes = await axios.get(`${API_URL}/agents/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivities(activityRes.data);
    } catch (err) {
      setAgentError(err.response?.data?.message || "Failed to create agent");
    }
  };

  const handleEditAgent = async (e) => {
    e.preventDefault();
    setEditAgentError("");

    try {
      const token = localStorage.getItem("token");
      const payload = { ...editAgentForm };
      if (!payload.password) delete payload.password; // Don't send empty password

      await axios.put(`${API_URL}/agents/${editAgent.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowEditAgent(false);

      const agentsRes = await axios.get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(agentsRes.data);

      const activityRes = await axios.get(`${API_URL}/agents/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivities(activityRes.data);
    } catch (err) {
      setEditAgentError(
        err.response?.data?.message || "Failed to update agent",
      );
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!confirm("Delete this agent?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/agents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refresh agents
      const agentsRes = await axios.get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(agentsRes.data);

      // Refresh activity
      const activityRes = await axios.get(`${API_URL}/agents/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivities(activityRes.data);
    } catch (err) {
      alert("Failed to delete agent");
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/agents/${id}/toggle-status`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      // Refresh agents
      const agentsRes = await axios.get(`${API_URL}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgents(agentsRes.data);

      // Refresh activity
      const activityRes = await axios.get(`${API_URL}/agents/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivities(activityRes.data);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`bg-[#0a1628] h-screen flex flex-col fixed left-0 top-0 bottom-0 z-10 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"}`}
      >
        <div
          className={`border-b border-gray-700 shrink-0 ${sidebarOpen ? "p-6" : "p-3"}`}
        >
          {sidebarOpen ? (
            <>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Attitech
              </h1>
              <p className="text-xs text-gray-400 mt-1">CRM Platform</p>
            </>
          ) : (
            <h1 className="text-xl font-bold text-white tracking-tight text-center">
              A
            </h1>
          )}
        </div>

        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            } ${sidebarOpen ? "px-4 py-3" : "px-2 py-3 justify-center"}`}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {sidebarOpen && "Dashboard"}
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              activeTab === "agents"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            } ${sidebarOpen ? "px-4 py-3" : "px-2 py-3 justify-center"}`}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            {sidebarOpen && "Agents"}
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              activeTab === "leads"
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            } ${sidebarOpen ? "px-4 py-3" : "px-2 py-3 justify-center"}`}
          >
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            {sidebarOpen && "Leads"}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition shrink-0"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                {user.name.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-16"}`}
      >
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {activeTab === "dashboard" && "Dashboard Overview"}
            {activeTab === "agents" && "Agent Management"}
            {activeTab === "leads" && "Lead Management"}
          </h2>
        </div>
        {/* Content area */}
        <div className="p-8">
          {activeTab === "dashboard" && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  {
                    label: "Total Agents",
                    value: stats.totalAgents,
                    icon: "👥",
                    color: "from-blue-600 to-blue-800",
                  },
                  {
                    label: "Total Leads",
                    value: stats.totalLeads,
                    icon: "📊",
                    color: "from-indigo-600 to-indigo-800",
                  },
                  {
                    label: "Active Leads",
                    value: stats.activeLeads,
                    icon: "🔥",
                    color: "from-cyan-600 to-cyan-800",
                  },
                  {
                    label: "Closed",
                    value: stats.closedLeads,
                    icon: "✅",
                    color: "from-teal-600 to-teal-800",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{stat.icon}</span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r ${stat.color} text-white`}
                      >
                        +0%
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h3>
                <div className="text-center py-12 text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((log, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 text-sm border-b last:border-0 pb-3 last:pb-0"
                        >
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <span className="text-gray-900">{log.details}</span>
                          <span className="text-gray-400 ml-auto text-xs">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "agents" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  All Agents
                </h3>
                <button
                  onClick={() => setShowAddAgent(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  + Add Agent
                </button>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">No agents yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Created</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b last:border-0">
                        <td className="py-3 text-sm text-gray-900">
                          {agent.name}
                        </td>
                        <td className="py-3 text-sm text-gray-600">
                          {agent.email}
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              agent.role === "opener"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {agent.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleToggleStatus(agent.id)}
                            className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer ${
                              agent.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {agent.status}
                          </button>
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {new Date(agent.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setEditAgent(agent);
                                setEditAgentForm({
                                  name: agent.name,
                                  email: agent.email,
                                  password: "",
                                  role: agent.role,
                                  status: agent.status,
                                });
                                setShowEditAgent(true);
                              }}
                              className="text-blue-500 hover:text-blue-700 transition"
                              title="Edit"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="text-red-500 hover:text-red-700 transition"
                              title="Delete"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Add Agent Modal */}
          {showAddAgent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Add New Agent
                  </h3>
                  <button
                    onClick={() => setShowAddAgent(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {agentError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-4 text-sm">
                    {agentError}
                  </div>
                )}

                <form onSubmit={handleAddAgent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newAgent.name}
                      onChange={(e) =>
                        setNewAgent({ ...newAgent, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newAgent.email}
                      onChange={(e) =>
                        setNewAgent({ ...newAgent, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newAgent.password}
                        onChange={(e) =>
                          setNewAgent({ ...newAgent, password: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v4m0 0a9 9 0 01-9-9m9 9a9 9 0 009-9"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={newAgent.role}
                      onChange={(e) =>
                        setNewAgent({ ...newAgent, role: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="opener">Opener</option>
                      <option value="closer">Closer</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAgent(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
                    >
                      Create Agent
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Agent Modal */}
          {showEditAgent && editAgent && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit Agent
                  </h3>
                  <button
                    onClick={() => setShowEditAgent(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {editAgentError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded mb-4 text-sm">
                    {editAgentError}
                  </div>
                )}

                <form onSubmit={handleEditAgent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editAgentForm.name}
                      onChange={(e) =>
                        setEditAgentForm({
                          ...editAgentForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editAgentForm.email}
                      onChange={(e) =>
                        setEditAgentForm({
                          ...editAgentForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (leave blank to keep current)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        value={editAgentForm.password}
                        onChange={(e) =>
                          setEditAgentForm({
                            ...editAgentForm,
                            password: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showEditPassword ? (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v4m0 0a9 9 0 01-9-9m9 9a9 9 0 009-9"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={editAgentForm.role}
                      onChange={(e) =>
                        setEditAgentForm({
                          ...editAgentForm,
                          role: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="opener">Opener</option>
                      <option value="closer">Closer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editAgentForm.status}
                      onChange={(e) =>
                        setEditAgentForm({
                          ...editAgentForm,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEditAgent(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "leads" && <LeadsManager />}
        </div>
      </main>
    </div>
  );
}
