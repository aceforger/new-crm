import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// const API_URL = import.meta.env.VITE_API_URL;

import { API_URL } from "../config";

export default function LeadsManager() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStripModal, setShowStripModal] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [stripAgent, setStripAgent] = useState("");
  const [coolingHours, setCoolingHours] = useState(168);
  const [limit, setLimit] = useState(20);

  const [selectedLead, setSelectedLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);

  const token = localStorage.getItem("token");

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [editingNote, setEditingNote] = useState(null);
  const [editNoteText, setEditNoteText] = useState("");

  const [dupGroups, setDupGroups] = useState([]);
  const [showDupModal, setShowDupModal] = useState(false);
  const [dupLeads, setDupLeads] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    book_title: "",
    status: "",
    transferred_to: "",
    assigned_agent_id: "",
    is_pinned: 0,
  });
  const [editAgents, setEditAgents] = useState([]);
  const [editClosers, setEditClosers] = useState([]);

  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/leads`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search, tab },
      });
      setLeads(res.data.leads);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error("Failed to fetch leads");
    }
  }, [page, tab, search, limit, token]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const toggleSelectAll = () => {
    const selectable = leads.filter(
      (l) => !l.assigned_agent_id && !isCooling(l) && l.status !== "closed",
    );
    if (selectedLeads.length === selectable.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(selectable.map((l) => l.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const openAssignModal = async () => {
    try {
      const res = await axios.get(`${API_URL}/leads/active-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveAgents(res.data);
      setSelectedAgent("");
      setShowAssignModal(true);
    } catch (err) {
      alert("Failed to load agents");
    }
  };

  const handleAssign = async () => {
    if (!selectedAgent) return alert("Select an agent");
    try {
      await axios.post(
        `${API_URL}/leads/assign`,
        { leadIds: selectedLeads, agentId: selectedAgent },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setShowAssignModal(false);
      setSelectedLeads([]);
      fetchLeads();
      alert(`${selectedLeads.length} leads assigned successfully!`);
    } catch (err) {
      alert("Assignment failed");
    }
  };

  const openStripModal = async () => {
    try {
      const res = await axios.get(`${API_URL}/leads/active-agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgentsList(res.data);
      setStripAgent("");
      setShowStripModal(true);
    } catch (err) {
      alert("Failed to load agents");
    }
  };

  const handleStripLeads = async () => {
    if (!stripAgent) return alert("Select an agent");
    try {
      const res = await axios.post(
        `${API_URL}/leads/strip-agent`,
        { agentId: stripAgent, coolingHours },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setShowStripModal(false);
      fetchLeads();
      alert(res.data.message || "Leads changed successfully!");
    } catch (err) {
      alert("Failed to strip leads");
    }
  };

  const handleRestoreAllCooling = async () => {
    if (
      !confirm(
        "Restore all cooling leads to unassigned? Pinned leads will not be affected.",
      )
    )
      return;
    try {
      const res = await axios.post(
        `${API_URL}/leads/remove-all-cooling`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(res.data.message);
      fetchLeads();
    } catch (err) {
      alert("Failed to restore cooling leads");
    }
  };

  const isCooling = (lead) => {
    return lead.cooling_until && new Date(lead.cooling_until) > new Date();
  };

  const handleDeleteLeads = async () => {
    try {
      await axios.delete(`${API_URL}/leads/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { leadIds: selectedLeads },
      });
      setShowDeleteModal(false);
      setSelectedLeads([]);
      fetchLeads();
    } catch (err) {
      alert("Failed to delete leads");
    }
  };

  const handleEditLead = async () => {
    if (!editForm.name || !editForm.phone)
      return alert("Name and phone required");
    try {
      await axios.put(`${API_URL}/leads/${editLead.id}`, editForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowEditModal(false);
      fetchLeads();
    } catch (err) {
      alert("Failed to update lead");
    }
  };

  const fetchDuplicates = async () => {
    try {
      const res = await axios.get(`${API_URL}/leads/duplicates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDupGroups(res.data.duplicates);
    } catch (err) {
      console.error("Failed to fetch duplicates");
    }
  };

  useEffect(() => {
    if (tab === "duplicates") {
      fetchDuplicates();
    } else {
      fetchLeads();
    }
  }, [tab]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress since we can't track actual upload progress easily
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 5, 90));
    }, 500);

    try {
      const res = await axios.post(`${API_URL}/upload/leads`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        alert(res.data.message);
        fetchLeads();
        window.location.reload();
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      alert(err.response?.data?.message || "Upload failed");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        e.target.value = "";
      }, 1000);
    }
  };

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

  const updateNote = async (noteId) => {
    if (!editNoteText.trim()) return;
    try {
      await axios.put(
        `${API_URL}/leads/notes/${noteId}`,
        { note: editNoteText },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const res = await axios.get(`${API_URL}/leads/${selectedLead.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data);
      setEditingNote(null);
    } catch (err) {
      alert("Failed to update note");
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    try {
      await axios.delete(`${API_URL}/leads/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await axios.get(`${API_URL}/leads/${selectedLead.id}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data);
    } catch (err) {
      alert("Failed to delete note");
    }
  };

  const openNotes = async (lead) => {
    setSelectedLead(lead);
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

  return (
    <div>
      {/* Tabs + Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {/* "assigned", */}
          {["all", "closed", "unassigned", "duplicates", "wrong"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setPage(1);
                setSelectedLeads([]);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-70 transition relative overflow-hidden"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {uploadProgress}%
              </span>
            ) : (
              "Import Leads"
            )}
          </button>
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          <button
            onClick={handleRestoreAllCooling}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            Restore All Cooling
          </button>
          <button
            onClick={openStripModal}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
          >
            Change Leads
          </button>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex justify-between items-center mb-4">
        <form onSubmit={handleSearch} className="flex gap-2">
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

        {selectedLeads.length > 0 && (
          <div className="flex gap-2">
            <span className="text-sm text-gray-500 py-2">
              {selectedLeads.length} selected
            </span>
            <button
              onClick={openAssignModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Assign
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {tab === "duplicates" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Duplicate Leads ({dupGroups.length} groups)
          </h3>

          {dupGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No duplicates found
            </p>
          ) : (
            <div className="space-y-3">
              {dupGroups.map((group, i) => (
                <div key={i} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        📞 {group.phone}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {group.count} leads: {group.names}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const ids = group.lead_ids.split(",").map(Number);
                        const res = await axios.post(
                          `${API_URL}/leads/by-ids`,
                          { ids },
                          {
                            headers: { Authorization: `Bearer ${token}` },
                          },
                        );
                        setDupLeads(res.data.leads);
                        setShowDupModal(true);
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      View Leads
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 mb-5">
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
        <table className="w-full">
          <thead className="bg-blue-800 border-b">
            <tr className="text-left text-sm text-white">
              <th className="p-3">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    selectedLeads.length ===
                      leads.filter(
                        (l) =>
                          !l.assigned_agent_id &&
                          !isCooling(l) &&
                          l.status !== "closed",
                      ).length &&
                    leads.filter(
                      (l) =>
                        !l.assigned_agent_id &&
                        !isCooling(l) &&
                        l.status !== "closed",
                    ).length > 0
                  }
                />
              </th>
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium min-w-[160px]">Phone</th>
              <th className="p-3 font-medium">Book Title</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Agent</th>
              <th className="p-3 font-medium">Cooling</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan="9"
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
                  <td className="p-3">
                    {lead.status === "closed" ? (
                      <span className="text-gray-300 text-sm">🔒</span>
                    ) : tab === "unassigned" ||
                      (!lead.assigned_agent_id && !isCooling(lead)) ? (
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                      />
                    ) : (
                      <span className="text-gray-300 text-sm">🔒</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-900">{lead.id}</td>
                  <td className="p-3 text-sm text-gray-900">{lead.name}</td>
                  <td
                    className={`p-3 text-xs min-w-[200px] break-words ${lead.is_wrong_number ? "text-red-600 line-through" : "text-gray-600"}`}
                  >
                    {lead.phone}
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-[200px] break-words">
                    {lead.book_title || "-"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {lead.agent_name || "-"}
                  </td>
                  <td className="p-3">
                    {isCooling(lead) ? (
                      <span className="text-xs text-orange-600 font-medium">
                        Until{" "}
                        {new Date(lead.cooling_until).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => {
                          setEditLead(lead);
                          setEditForm({
                            name: lead.name,
                            phone: lead.phone,
                            email: lead.email || "",
                            book_title: lead.book_title || "",
                            status: lead.status || "new",
                            transferred_to: lead.transferred_to || "",
                            assigned_agent_id: lead.assigned_agent_id || "",
                            is_pinned: lead.is_pinned || 0,
                          });
                          // Fetch agents and closers
                          axios
                            .get(`${API_URL}/leads/active-agents`, {
                              headers: { Authorization: `Bearer ${token}` },
                            })
                            .then((res) => {
                              setEditAgents(res.data);
                              // setEditClosers(
                              //   res.data.filter((a) => a.role === "closer"),
                              // );
                              setEditClosers(res.data); // Show all active agents
                            })
                            .catch(() => {});
                          setShowEditModal(true);
                        }}
                        className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openNotes(lead)}
                        className={`text-xs font-medium px-2 py-1 rounded cursor-pointer ${lead.notes_count > 0 ? "bg-blue-200 text-blue-800 hover:bg-blue-300" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
                      >
                        {lead.notes_count > 0
                          ? `Notes (${lead.notes_count})`
                          : "Notes"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete lead: ${lead.name}?`)) return;
                          try {
                            await axios.delete(`${API_URL}/leads/bulk-delete`, {
                              headers: { Authorization: `Bearer ${token}` },
                              data: { leadIds: [lead.id] },
                            });
                            fetchLeads();
                          } catch (err) {
                            alert("Failed to delete lead");
                          }
                        }}
                        className="text-xs font-medium px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
                      >
                        Delete
                      </button>
                      {lead.is_wrong_number === 1 && (
                        <button
                          onClick={async () => {
                            if (!confirm("Unmark this lead as wrong number?"))
                              return;
                            try {
                              await axios.patch(
                                `${API_URL}/leads/${lead.id}/unmark-wrong`,
                                {},
                                {
                                  headers: { Authorization: `Bearer ${token}` },
                                },
                              );
                              fetchLeads();
                            } catch (err) {
                              alert("Failed to unmark");
                            }
                          }}
                          className="text-xs font-medium px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                        >
                          ✓ Fix
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm">
              {page} / {totalPages}
            </span>
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

      {/* Edit Lead Modal */}
      {showEditModal && editLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Lead</h3>
              <button
                onClick={() => setShowEditModal(false)}
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={editForm.book_title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, book_title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="transferred">Transferred</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {editForm.status === "transferred" && (
                <div>
                  {/* <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer to Closer
                  </label>
                  <select
                    value={editForm.transferred_to}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        transferred_to: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pick closer --</option>
                    {editClosers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select> */}

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer to Agent
                  </label>
                  <select
                    value={editForm.transferred_to}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        transferred_to: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pick agent --</option>
                    {editClosers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Agent
              </label>
              <select
                value={editForm.assigned_agent_id}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    assigned_agent_id: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Unassigned --</option>
                {editAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_pinned === 1}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      is_pinned: e.target.checked ? 1 : 0,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <span className="font-medium text-gray-700">Pin this lead</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditLead}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Save
              </button>
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
            {notes.map((note) => (
              <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                {editingNote === note.id ? (
                  <div>
                    <textarea
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                      rows="2"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateNote(note.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingNote(null)}
                        className="text-xs bg-gray-300 px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-900">{note.note}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {note.author}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          setEditingNote(note.id);
                          setEditNoteText(note.note);
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
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

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Assign Leads
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
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
            <p className="text-sm text-gray-500 mb-4">
              {selectedLeads.length} leads selected
            </p>
            <div className="space-y-2 mb-4 max-h-90 overflow-y-auto">
              {activeAgents.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No active agents available
                </p>
              ) : (
                activeAgents.map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedAgent == agent.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="agent"
                      value={agent.id}
                      checked={selectedAgent == agent.id}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="hidden"
                    />
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {agent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-500">{agent.role}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">
                ⚠️ Delete Leads
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
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
            <p className="text-sm text-gray-600 mb-4">
              You are about to permanently delete{" "}
              <span className="font-bold text-red-600">
                {selectedLeads.length} leads
              </span>
              . This action cannot be undone.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">Leads to delete:</p>
              {leads
                .filter((l) => selectedLeads.includes(l.id))
                .map((lead) => (
                  <div
                    key={lead.id}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span className="text-gray-900">{lead.name}</span>
                    <span className="text-gray-400">{lead.phone}</span>
                  </div>
                ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLeads}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Yes, Delete {selectedLeads.length} Leads
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strip Agent Modal */}
      {showStripModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Change Leads
              </h3>
              <button
                onClick={() => setShowStripModal(false)}
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
            <p className="text-sm text-gray-500 mb-4">
              Remove all non-pinned leads from an agent and apply cooling period
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent
              </label>
              <select
                value={stripAgent}
                onChange={(e) => setStripAgent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Choose agent --</option>
                {agentsList.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cooling Period (hours)
              </label>
              <input
                type="number"
                value={coolingHours}
                onChange={(e) => setCoolingHours(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStripModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStripLeads}
                className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
              >
                Remove & Cool
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Modal */}
      {showDupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Duplicate Leads
              </h3>
              <button
                onClick={() => setShowDupModal(false)}
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Phone</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Book Title</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Agent</th>
                    <th className="p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dupLeads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="p-3 text-sm text-gray-900">{lead.name}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {lead.phone}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {lead.email || "-"}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {lead.book_title || "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {lead.agent_name || "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditLead(lead);
                              setEditForm({
                                name: lead.name,
                                phone: lead.phone,
                                email: lead.email || "",
                                book_title: lead.book_title || "",
                                status: lead.status || "new",
                                transferred_to: lead.transferred_to || "",
                                assigned_agent_id: lead.assigned_agent_id || "",
                                is_pinned: lead.is_pinned || 0,
                              });
                              axios
                                .get(`${API_URL}/leads/active-agents`, {
                                  headers: { Authorization: `Bearer ${token}` },
                                })
                                .then((res) => {
                                  setEditAgents(res.data);
                                  // setEditClosers(
                                  //   res.data.filter((a) => a.role === "closer"),
                                  // );
                                  setEditClosers(res.data); // Show all active agents
                                })
                                .catch(() => {});
                              setShowDupModal(false);
                              setShowEditModal(true);
                            }}
                            className="text-xs text-blue-600 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm("Delete this lead?")) return;
                              try {
                                await axios.delete(
                                  `${API_URL}/leads/bulk-delete`,
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                    data: { leadIds: [lead.id] },
                                  },
                                );
                                // Refresh the duplicate list
                                const res = await axios.post(
                                  `${API_URL}/leads/by-ids`,
                                  {
                                    ids: dupLeads
                                      .filter((l) => l.id !== lead.id)
                                      .map((l) => l.id),
                                  },
                                  {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  },
                                );
                                setDupLeads(res.data.leads);
                                fetchDuplicates(); // Refresh the groups too
                              } catch (err) {
                                alert("Failed to delete lead");
                              }
                            }}
                            className="text-xs text-red-600 hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
