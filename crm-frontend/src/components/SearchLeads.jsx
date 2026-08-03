import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";

export default function SearchLeads() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/leads/search-all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search, limit: 50 },
      });
      setResults(res.data.leads);
    } catch (err) {
      console.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all leads by name, phone, email, or book title..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {loading && (
        <p className="text-sm text-gray-400 text-center py-8">Searching...</p>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No leads found</p>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-sm text-gray-500">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Book Title</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Agent</th>
                <th className="p-3 font-medium">Transferred To</th>
              </tr>
            </thead>
            <tbody>
              {results.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b last:border-0 hover:bg-gray-50"
                >
                  <td className="p-3 text-sm text-gray-900">{lead.name}</td>
                  <td className="p-3 text-sm text-gray-600">{lead.phone}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {lead.email || "-"}
                  </td>
                  <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">
                    {lead.book_title || "-"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        lead.status === "new"
                          ? "bg-blue-100 text-blue-700"
                          : lead.status === "contacted"
                            ? "bg-yellow-100 text-yellow-700"
                            : lead.status === "transferred"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {lead.agent_name || "Unassigned"}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {lead.transferred_to_name || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
