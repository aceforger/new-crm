import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import SearchLeads from "../components/SearchLeads";

import { API_URL } from "../config";

// const API_URL = import.meta.env.VITE_API_URL;

export default function AgentDashboard() {
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(20);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const [selectedLead, setSelectedLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);

  const [transferAgentId, setTransferAgentId] = useState({});
  const [closers, setClosers] = useState([]);

  const lastSavedRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifItems, setNotifItems] = useState([]);

  const [tab, setTab] = useState(() => {
    return localStorage.getItem("agentTab") || "active";
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const [detailData, setDetailData] = useState({
    opener_notes: "",
    closer_notes: "",
    close_status: "",
    payment_type: "",
    amount: "",
    services: "",
    new_services: "",
    follow_up_date: "",
    follow_up_notes: "",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [quote, setQuote] = useState({ text: "", author: "" });

  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [authorLead, setAuthorLead] = useState(null);
  const [aiContent, setAiContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Save tab to localStorage
  useEffect(() => {
    localStorage.setItem("agentTab", tab);
  }, [tab]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!stored || !token) {
      navigate("/");
      return;
    }
    const userData = JSON.parse(stored);
    if (userData.role === "admin") {
      navigate("/admin");
      return;
    }
    setUser(userData);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");

    const fetchNotifs = async () => {
      try {
        const res = await axios.get(`${API_URL}/leads/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifCount(res.data.count);
        setNotifItems(res.data.items || []);
      } catch (err) {}
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API_URL}/leads/active-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        // setClosers(res.data.filter((a) => a.role === "closer"));
        setClosers(res.data);
      })
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/leads/my-leads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search, tab, statusFilter },
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }, [page, tab, search, limit, statusFilter]);

  useEffect(() => {
    if (user) fetchLeads();
  }, [fetchLeads, user]);

  const fetchDetailData = useCallback(async (leadId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_URL}/leads/${leadId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data) {
        const fresh = {
          opener_notes: res.data.opener_notes || "",
          closer_notes: res.data.closer_notes || "",
          close_status: res.data.close_status || "",
          payment_type: res.data.payment_type || "",
          amount: res.data.amount || "",
          services: res.data.services || "",
          new_services: res.data.new_services || "",
          follow_up_date: res.data.follow_up_date || "",
          follow_up_notes: res.data.follow_up_notes || "",
        };
        const freshServices = res.data.services
          ? res.data.services.split(",")
          : [];

        // Only update if data changed on server (someone else saved)
        const freshStr = JSON.stringify({
          ...fresh,
          services: freshServices.join(","),
        });
        if (freshStr !== lastSavedRef.current) {
          setDetailData(fresh);
          setSelectedServices(freshServices);
          lastSavedRef.current = freshStr;
        }
      } else {
        setDetailData({
          opener_notes: "",
          closer_notes: "",
          close_status: "",
          payment_type: "",
          amount: "",
          services: "",
          new_services: "",
          follow_up_date: "",
          follow_up_notes: "",
        });
        setSelectedServices([]);
        lastSavedRef.current = null;
      }
    } catch (err) {
      console.error("Failed to fetch details");
    }
  }, []);

  useEffect(() => {
    if (showDetailModal && detailLead) {
      fetchDetailData(detailLead.id);
      const interval = setInterval(() => {
        if (!isTyping) fetchDetailData(detailLead.id);
      }, 500000);
      return () => clearInterval(interval);
    }
  }, [showDetailModal, detailLead, fetchDetailData, isTyping]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showNotifs && !e.target.closest(".notif-dropdown")) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showNotifs]);

  const saveDetailData = async () => {
    if (user.role === "opener" && !detailData.opener_notes.trim()) {
      alert("Please add opener notes before saving.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const payload = { ...detailData, services: selectedServices.join(",") };
      await axios.post(`${API_URL}/leads/${detailLead.id}/details`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      lastSavedRef.current = JSON.stringify(payload);

      // If closer set a follow-up date, notify opener
      if (user.role === "closer" && detailData.follow_up_date) {
        await axios.post(
          `${API_URL}/leads/${detailLead.id}/notes`,
          {
            note: `📅 Follow-up scheduled: ${new Date(detailData.follow_up_date).toLocaleString()}`,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      alert("Saved!");
      setShowDetailModal(false);
    } catch (err) {
      alert("Failed to save");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleStatusChange = async (leadId, newStatus, transferTo = null) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/leads/${leadId}/status`,
        { status: newStatus, transferTo },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchLeads();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleTogglePin = async (leadId, leadStatus, isPinned) => {
    // Closed leads cannot be unpinned
    if (leadStatus === "closed") {
      alert("Closed leads cannot be unpinned.");
      return;
    }

    // If pinned and trying to unpin, confirm
    if (isPinned) {
      if (!confirm("Unpin this lead? It will return to New status.")) return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/leads/${leadId}/toggle-pin`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchLeads();
    } catch (err) {
      alert("Failed to toggle pin");
    }
  };

  const quotes = [
    {
      text: "Every call is a step closer to a signed deal.",
      author: "Pipeline Builder",
    },
    {
      text: "The more you prospect, the luckier you get.",
      author: "Lead Gen Pro",
    },
    {
      text: "A full pipeline cures every sales problem.",
      author: "Top Closer",
    },
    {
      text: "Someone out there needs your book today. Go find them.",
      author: "Author Advocate",
    },
    {
      text: "Rejection is just redirection to the right client.",
      author: "Sales Coach",
    },
    {
      text: "The best time to prospect was yesterday. The second best is now.",
      author: "Sales Veteran",
    },
    {
      text: "Your next big deal is hiding in your uncontacted leads.",
      author: "CRM Guru",
    },
    {
      text: "A quiet phone never closed a deal.",
      author: "Top Earner",
    },
    {
      text: "Every 'not interested' gets you closer to 'tell me more'.",
      author: "Sales Mentor",
    },
    {
      text: "Fill the pipe. Work the pipe. Close the pipe.",
      author: "Agency Owner",
    },
    {
      text: "Great conversations start with great prospects.",
      author: "Lead Hunter",
    },
    {
      text: "The fortune is in the follow-up. Always.",
      author: "Closer Mindset",
    },
    {
      text: "Don't chase clients. Attract them with value.",
      author: "Trusted Advisor",
    },
    {
      text: "Prospecting isn't a task. It's the lifeline of your business.",
      author: "Sales Director",
    },
    {
      text: "One conversation can change everything.",
      author: "Deal Maker",
    },
    {
      text: "The more people you talk to, the more deals you close.",
      author: "Sales Math",
    },
    {
      text: "Your pipeline should be so full it scares you a little.",
      author: "Growth Hacker",
    },
    {
      text: "A great agent turns a cold lead into a warm handshake.",
      author: "Client Builder",
    },
    {
      text: "Today's prospect is tomorrow's testimonial.",
      author: "Success Story",
    },
    {
      text: "Keep dialing. Keep smiling. Keep closing.",
      author: "Daily Grind",
    },
  ];

  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    // Random start
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuoteIndex(randomIndex);

    // Rotate every 30 seconds
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "contacted":
        return "bg-yellow-100 text-yellow-700";
      case "transferred":
        return "bg-purple-100 text-purple-700";
      case "closed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const openNotes = async (lead) => {
    setSelectedLead(lead);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`${API_URL}/leads/${lead.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data);
    } catch (err) {
      setNotes([]);
    }
    setNewNote("");
    setShowNoteModal(true);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/leads/${selectedLead.id}/notes`,
        { note: newNote },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const res = await axios.get(`${API_URL}/leads/${selectedLead.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data);
      setNewNote("");
    } catch (err) {
      alert("Failed to add note");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`bg-[#0b4294] h-screen flex flex-col fixed left-0 top-0 bottom-0 z-10 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-16"}`}
      >
        <div
          className={`border-b border-gray-700 shrink-0 ${sidebarOpen ? "p-6" : "p-3"}`}
        >
          {sidebarOpen ? (
            <>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Attitech
              </h1>
              <p className="text-xs text-gray-400 mt-1">Agent Portal</p>
            </>
          ) : (
            <h1 className="text-xl font-bold text-white tracking-tight text-center">
              A
            </h1>
          )}
        </div>

        <nav className="flex-1 px-2 py-6 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              setTab("active");
              setPage(1);
              setLeads([]);
              setTotal(0);
            }}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              tab === "active"
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
            {sidebarOpen && "My Leads"}
          </button>

          <button
            onClick={() => {
              setTab("pinned");
              setPage(1);
              setLeads([]);
              setTotal(0);
            }}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              tab === "pinned"
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
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {sidebarOpen && "Pinned Leads"}
          </button>

          <button
            onClick={() => {
              setTab("search");
              setPage(1);
            }}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition ${
              tab === "search"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {sidebarOpen && "Search Leads"}
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
                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition shrink-0"
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
            {tab === "active" && "My Leads"}
            {tab === "pinned" && "Pinned Leads"}
            {tab === "search" && "Search Leads"}
          </h2>

          {/* Notification Bell */}
          <div className="ml-auto relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifs(!showNotifs);
              }}
              className="text-gray-600 hover:text-gray-900 relative"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {notifCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b">
                  <p className="text-sm font-semibold text-gray-900">
                    Notifications
                  </p>
                </div>
                {notifItems.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No notifications
                  </p>
                ) : (
                  notifItems.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setShowNotifs(false);
                        setTab("pinned");
                        setPage(1);
                        setDetailLead(item);
                        setShowDetailModal(true);
                        fetchLeads();
                      }}
                      className="p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    >
                      <p className="text-sm text-gray-900 font-medium">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.type === "transfer" &&
                          "🔄 Lead transferred to you"}
                        {item.type === "followup_due" &&
                          "🔔 Follow-up due now!"}
                        {item.type === "followup_set" &&
                          "📅 Follow-up scheduled"}
                      </p>
                      {item.follow_up_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(item.follow_up_date).toLocaleString()}
                        </p>
                      )}
                      {item.book_title && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          Book: {item.book_title}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Daily Quote with Animation */}
        <div className="mx-8 mt-4">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white px-8 py-5 rounded-xl shadow-xl shadow-blue-900/20 relative overflow-hidden group">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse delay-700"></div>
            </div>

            {/* Rotating stars */}
            <div className="absolute top-3 right-8 animate-spin-slow text-yellow-300 text-lg">
              ✧
            </div>
            <div className="absolute top-8 right-20 animate-spin-reverse text-yellow-300 text-sm">
              ✧
            </div>
            <div className="absolute bottom-4 right-16 animate-spin-slow text-yellow-300 text-xs delay-500">
              ✧
            </div>

            {/* Twinkling stars */}
            <div className="absolute top-2 right-4 text-yellow-300 animate-twinkle text-xs">
              ✦
            </div>
            <div className="absolute bottom-3 right-28 text-yellow-300 animate-twinkle delay-300 text-[10px]">
              ✦
            </div>
            <div className="absolute top-6 right-32 text-yellow-300 animate-twinkle delay-700 text-[8px]">
              ✦
            </div>

            {/* Quote icon */}
            <div className="flex items-start gap-3 relative z-10">
              <div className="shrink-0 mt-1">
                <svg
                  className="w-6 h-6 text-blue-300 opacity-80"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm italic leading-relaxed animate-fadeIn">
                  "{quotes[quoteIndex].text}"
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-blue-300 to-transparent"></div>
                  <p className="text-xs text-blue-200 font-medium whitespace-nowrap">
                    — {quotes[quoteIndex].author}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom shine */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          </div>
        </div>

        {(tab === "active" || tab === "pinned") && (
          <div className="p-8">
            {/* Search */}
            {/* Search */}
            <div className="flex justify-between items-center mb-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPage(1);
                  fetchLeads();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64"
                />
                <button
                  type="submit"
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Search
                </button>
              </form>
              <span className="text-sm text-gray-500">
                Total: {total} leads
              </span>
            </div>

            {tab === "pinned" && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setStatusFilter("")}
                  className={`px-3 py-1 text-xs rounded-full border ${!statusFilter ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("transferred")}
                  className={`px-3 py-1 text-xs rounded-full border ${statusFilter === "transferred" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  Transferred
                </button>
                <button
                  onClick={() => setStatusFilter("closed")}
                  className={`px-3 py-1 text-xs rounded-full border ${statusFilter === "closed" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300"}`}
                >
                  Closed
                </button>
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                  <option value="2000">2000</option>
                </select>
                <span className="text-sm text-gray-500">of {total} leads</span>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <input
                    type="number"
                    value={page}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= totalPages) setPage(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= totalPages) setPage(val);
                      }
                    }}
                    className="w-16 text-center text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                    min="1"
                    max={totalPages}
                  />
                  <span className="text-sm text-gray-500">/ {totalPages}</span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left text-sm text-gray-500">
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Phone</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Book Title</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Transfer</th>
                      <th className="p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : leads.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center py-12 text-gray-400 text-sm"
                        >
                          No leads found
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b last:border-0 hover:bg-gray-50"
                        >
                          <td
                            className="p-3 text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            onClick={() => {
                              setAuthorLead(lead);
                              setShowAuthorModal(true);
                              setAiContent("");
                              setAiLoading(true);

                              axios
                                .post(
                                  `${API_URL}/gemini/author-info`,
                                  {
                                    name: lead.name,
                                    email: lead.email,
                                    book_title: lead.book_title,
                                  },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                                    },
                                  },
                                )
                                .then((res) => {
                                  setAiContent(res.data.content);
                                })
                                .catch(() => {
                                  setAiContent("Failed to load author info.");
                                })
                                .finally(() => {
                                  setAiLoading(false);
                                });
                            }}
                          >
                            {lead.name}
                          </td>
                          {/* <td
                            className={`p-3 text-sm ${lead.is_wrong_number ? "text-red-600 line-through" : "text-gray-600"}`}
                          >
                            {lead.phone?.split(",")[0]?.trim()}
                            {lead.phone?.includes(",") && (
                              <span className="text-xs text-blue-500 ml-1">
                                +{lead.phone.split(",").length - 1}
                              </span>
                            )}
                            {lead.is_wrong_number &&
                              lead.wrong_number_notes && (
                                <p className="text-xs text-orange-600 mt-0.5 no-underline">
                                  📝 {lead.wrong_number_notes}
                                </p>
                              )}
                          </td> */}

                          <td
                            className={`p-3 text-sm ${lead.is_wrong_number ? "text-red-600" : "text-gray-600"}`}
                          >
                            {lead.phone?.includes(",")
                              ? lead.phone.split(",")[0].trim()
                              : lead.phone}
                            {lead.phone?.includes(",") &&
                              lead.phone.split(",").filter((p) => p.trim())
                                .length > 1 && (
                                <span className="text-xs text-blue-500 ml-1">
                                  +
                                  {lead.phone.split(",").filter((p) => p.trim())
                                    .length - 1}
                                </span>
                              )}
                          </td>

                          <td className="p-3 text-xs text-gray-600">
                            {lead.email || "-"}
                          </td>
                          <td className="p-3 text-xs max-w-[205px] break-words">
                            {lead.book_title ? (
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(lead.book_title + " by " + lead.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {lead.book_title}
                              </a>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <select
                              value={lead.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus === "transferred") {
                                  setTransferAgentId({
                                    ...transferAgentId,
                                    [lead.id]: "",
                                  });
                                } else {
                                  handleStatusChange(lead.id, newStatus);
                                }
                              }}
                              disabled={lead.status === "closed"}
                              className={`text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 ${lead.status === "closed" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                            >
                              {lead.status === "transferred" ? (
                                <>
                                  <option value="transferred">
                                    Transferred
                                  </option>
                                  <option value="contacted">Contacted</option>
                                  <option value="closed">Closed</option>
                                </>
                              ) : (
                                <>
                                  <option value="new">New</option>
                                  <option value="contacted">Contacted</option>
                                  <option value="transferred">
                                    Transferred
                                  </option>
                                  <option value="closed">Closed</option>
                                </>
                              )}
                            </select>
                            {(lead.status === "new" ||
                              lead.status === "contacted") &&
                              transferAgentId[lead.id] === "" && (
                                // <select
                                //   value=""
                                //   onChange={(e) => {
                                //     const closerId = e.target.value;
                                //     if (closerId) {
                                //       setTransferAgentId({
                                //         ...transferAgentId,
                                //         [lead.id]: closerId,
                                //       });
                                //       handleStatusChange(
                                //         lead.id,
                                //         "transferred",
                                //         closerId,
                                //       );
                                //       // Auto-open detail modal
                                //       setDetailLead(lead);
                                //       setShowDetailModal(true);
                                //       lastSavedRef.current = null;
                                //     }
                                //   }}
                                //   className="text-xs border border-purple-300 rounded px-2 py-1 mt-1 focus:outline-none focus:border-purple-500 w-full bg-purple-50"
                                // >
                                //   <option value="">Pick closer</option>
                                //   {closers.map((c) => (
                                //     <option key={c.id} value={c.id}>
                                //       {c.name}
                                //     </option>
                                //   ))}
                                // </select>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    const closerId = e.target.value;
                                    if (closerId) {
                                      setTransferAgentId({
                                        ...transferAgentId,
                                        [lead.id]: closerId,
                                      });
                                      handleStatusChange(
                                        lead.id,
                                        "transferred",
                                        closerId,
                                      );
                                      setDetailLead(lead);
                                      setShowDetailModal(true);
                                      lastSavedRef.current = null;
                                    }
                                  }}
                                  className="text-xs border border-purple-300 rounded px-2 py-1 mt-1 focus:outline-none focus:border-purple-500 w-full bg-purple-50"
                                >
                                  <option value="">Pick agent</option>
                                  {closers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.role})
                                    </option>
                                  ))}
                                </select>
                              )}
                            {lead.status === "transferred" &&
                              lead.transferred_to_name && (
                                <p className="text-xs text-purple-600 mt-1">
                                  To: {lead.transferred_to_name}
                                </p>
                              )}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {lead.transferred_to_name &&
                            lead.transferred_to_name !== user.name
                              ? `→ ${lead.transferred_to_name}`
                              : lead.transferred_by_name &&
                                  lead.transferred_by_name !== user.name
                                ? `← ${lead.transferred_by_name}`
                                : "-"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {(lead.status === "transferred" ||
                                lead.status === "closed") && (
                                <button
                                  onClick={() => {
                                    setDetailLead(lead);
                                    setShowDetailModal(true);
                                  }}
                                  className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                                >
                                  View
                                </button>
                              )}
                              <button
                                onClick={() => openNotes(lead)}
                                className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${lead.notes_count > 0 ? "bg-blue-200 text-blue-800 hover:bg-blue-300" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                              >
                                {lead.notes_count > 0
                                  ? `Notes (${lead.notes_count})`
                                  : "Notes"}
                              </button>
                              <button
                                onClick={() =>
                                  handleTogglePin(
                                    lead.id,
                                    lead.status,
                                    lead.is_pinned,
                                  )
                                }
                                className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${lead.is_pinned ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                              >
                                {lead.is_pinned ? "Pinned" : "Pin"}
                              </button>
                              <button
                                onClick={async () => {
                                  if (
                                    !confirm("Mark this lead as wrong number?")
                                  )
                                    return;
                                  try {
                                    await axios.patch(
                                      `${API_URL}/leads/${lead.id}/wrong-number`,
                                      { notes: null },
                                      {
                                        headers: {
                                          Authorization: `Bearer ${localStorage.getItem("token")}`,
                                        },
                                      },
                                    );
                                    fetchLeads();
                                  } catch (err) {
                                    alert("Failed to mark as wrong number");
                                  }
                                }}
                                className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
                                title="Wrong Number"
                              >
                                ✗ Wrong
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                  <option value="2000">2000</option>
                </select>
                <span className="text-sm text-gray-500">of {total} leads</span>
              </div>
              {totalPages > 1 && (
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <input
                    type="number"
                    value={page}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= 1 && val <= totalPages) setPage(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(e.target.value);
                        if (val >= 1 && val <= totalPages) setPage(val);
                      }
                    }}
                    className="w-16 text-center text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                    min="1"
                    max={totalPages}
                  />
                  <span className="text-sm text-gray-500">/ {totalPages}</span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Detail Modal */}
        {/* Detail Modal */}
        {showDetailModal && detailLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Lead Details
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveDetailData}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      if (
                        user.role === "opener" &&
                        !detailData.opener_notes.trim()
                      ) {
                        alert(
                          "Please add opener notes before closing. The closer needs this information.",
                        );
                        return;
                      }
                      setShowDetailModal(false);
                    }}
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
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex gap-6">
                {/* Left - 3/4 */}
                <div className="w-3/4 space-y-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">
                        Name
                      </label>
                      <p className="text-sm text-gray-900 font-medium">
                        {detailLead.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">
                        Phone
                      </label>
                      <p className="text-sm text-gray-900">
                        {detailLead.phone}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">
                        Email
                      </label>
                      <p className="text-sm text-gray-900">
                        {detailLead.email || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-0.5">
                        Book Title
                      </label>
                      <p className="text-sm text-gray-900">
                        {detailLead.book_title || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Opener Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Opener Notes
                    </label>
                    <textarea
                      value={detailData.opener_notes}
                      onChange={(e) =>
                        setDetailData({
                          ...detailData,
                          opener_notes: e.target.value,
                        })
                      }
                      disabled={user.role === "closer"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none ${user.role === "closer" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      rows="3"
                      placeholder="Add opener notes..."
                    />
                  </div>

                  {/* Closer Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Closer Notes
                    </label>
                    <textarea
                      value={detailData.closer_notes}
                      onChange={(e) =>
                        setDetailData({
                          ...detailData,
                          closer_notes: e.target.value,
                        })
                      }
                      disabled={user.role === "opener"}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none ${user.role === "opener" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      rows="3"
                      placeholder="Add closer notes..."
                    />
                  </div>

                  {/* Close Status */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Status
                    </label>
                    <select
                      value={detailData.close_status}
                      onChange={(e) =>
                        setDetailData({
                          ...detailData,
                          close_status: e.target.value,
                        })
                      }
                      disabled={user.role === "opener"}
                      className={`text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${user.role === "opener" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    >
                      <option value="">-- Select --</option>
                      <option value="CLOSED">CLOSED</option>
                      <option value="PIPE">PIPE</option>
                      <option value="PROSPECT">PROSPECT</option>
                    </select>
                  </div>

                  {/* Amount - only if CLOSED */}
                  {detailData.close_status === "CLOSED" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Amount
                      </label>
                      <div className="flex gap-3 items-center">
                        <select
                          value={detailData.payment_type}
                          onChange={(e) =>
                            setDetailData({
                              ...detailData,
                              payment_type: e.target.value,
                            })
                          }
                          className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option value="">-- Payment Type --</option>
                          <option value="initial">Initial</option>
                          <option value="full">Full</option>
                          <option value="more">More</option>
                        </select>
                        <input
                          type="text"
                          value={detailData.amount}
                          onChange={(e) =>
                            setDetailData({
                              ...detailData,
                              amount: e.target.value,
                            })
                          }
                          placeholder="$ Amount"
                          className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 w-36"
                        />
                      </div>
                    </div>
                  )}

                  {/* Follow-up Schedule - only if PIPE or PROSPECT */}
                  {(detailData.close_status === "PIPE" ||
                    detailData.close_status === "PROSPECT") && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Follow-up Schedule{" "}
                        {user.role === "opener" && "(View only)"}
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          detailData.follow_up_date
                            ? detailData.follow_up_date
                                .replace(" ", "T")
                                .substring(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          setDetailData({
                            ...detailData,
                            follow_up_date: e.target.value,
                          })
                        }
                        disabled={user.role === "opener"}
                        className={`text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${user.role === "opener" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                      />
                      <textarea
                        value={detailData.follow_up_notes}
                        onChange={(e) =>
                          setDetailData({
                            ...detailData,
                            follow_up_notes: e.target.value,
                          })
                        }
                        disabled={user.role === "opener"}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none mt-2 ${user.role === "opener" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        rows="2"
                        placeholder={
                          user.role === "opener"
                            ? "Closer will schedule follow-up"
                            : "Add follow-up notes..."
                        }
                      />
                    </div>
                  )}

                  {/* Services */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Services
                    </label>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {[
                        "Website",
                        "Press Release",
                        "Best Book / Best Author Program",
                        "Cinematic Video",
                        "Republishing",
                        "Book Cover",
                        "Set Your Own Price",
                      ].map((service) => (
                        <label
                          key={service}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...selectedServices, service]
                                : selectedServices.filter((s) => s !== service);
                              setSelectedServices(updated);
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-gray-700">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* New Services */}
                  <div className="mb-10">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      New Services
                    </label>
                    <input
                      type="text"
                      value={detailData.new_services}
                      onChange={(e) =>
                        setDetailData({
                          ...detailData,
                          new_services: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Add new service..."
                    />
                  </div>
                </div>

                {/* Right - 1/4 */}
                <div className="w-1/4 border-l border-gray-200 pl-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">
                    Call History
                  </h4>
                  <p className="text-xs text-gray-400 text-center py-8">
                    Coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNoteModal && selectedLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedLead.name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                </div>
                <button
                  onClick={() => setShowNoteModal(false)}
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

              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No notes yet
                  </p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-900">{note.note}</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {note.author}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                  rows="2"
                />
                <button
                  onClick={addNote}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Author Info Modal */}
        {showAuthorModal && authorLead && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {authorLead.name}{" "}
                  {authorLead.book_title ? `— ${authorLead.book_title}` : ""}
                </h3>
                <button
                  onClick={() => setShowAuthorModal(false)}
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

              <div className="flex-1 overflow-y-auto p-6">
                {/* AI Author Summary */}
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-500 mb-3">
                    🤖 AI Author Summary
                  </label>
                  {aiLoading ? (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-sm text-gray-500">
                        Researching author...
                      </p>
                    </div>
                  ) : aiContent ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                        {aiContent}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Lead Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">
                      Phone
                    </label>
                    <p className="text-sm text-gray-900">{authorLead.phone}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">
                      Email
                    </label>
                    <p className="text-sm text-gray-900">
                      {authorLead.email || "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-0.5">
                      Status
                    </label>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(authorLead.status)}`}
                    >
                      {authorLead.status}
                    </span>
                  </div>
                </div>

                {/* Quick Search Buttons */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-3">
                    Quick Search
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/search?q=${encodeURIComponent(`${authorLead.name} ${authorLead.book_title || ""} author`)}`,
                          "_blank",
                        )
                      }
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-blue-50 transition text-left"
                    >
                      <span className="text-lg">📚</span>
                      <div>
                        <p className="text-sm font-medium">Google Search</p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.amazon.com/s?k=${encodeURIComponent(authorLead.book_title || authorLead.name)}`,
                          "_blank",
                        )
                      }
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:bg-yellow-50 transition text-left"
                    >
                      <span className="text-lg">🛒</span>
                      <div>
                        <p className="text-sm font-medium">Amazon</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "search" && (
          <div className="p-8">
            <SearchLeads />
          </div>
        )}
      </main>
    </div>
  );
}
