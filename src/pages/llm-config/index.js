import React, { useState } from "react";
import axios from "axios";
import "./index.css";

export const LLMConfig = ({ file }) => {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false); // State to handle loading

  // Handle query input
  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  // Submit function to call the API
  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("query", query);

    setLoading(true); // Set loading to true when starting the API call
    try {
      const response = await axios.post(
        "http://54.169.213.200:3001/api/sla_breach",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setReport(response.data);
    } catch (error) {
      console.error("Error fetching the report:", error);
    } finally {
      setLoading(false); // Set loading to false after API call is complete
    }
  };

  return (
    <div className="llm-config">
      <h1>LLM Config</h1>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Enter your query here..."
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Loading..." : "Submit"}
        </button>
      </div>

      {report && !loading && (
        <div className="report-section">
          <h2 className="report-heading">Report</h2>

          <table>
            <thead>
              <tr>
                <th>Allowed Duration</th>
                <th>Priority</th>
                <th>Ticket</th>
                <th>Elapsed Time</th>
                <th>Status To</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{report["Allowed Duration"] || "N/A"}</td>
                <td>{report?.Priority || "N/A"}</td>
                <td>{report?.Ticket || "N/A"}</td>
                <td>{report["Total Elapsed Time"] || "N/A"}</td>
                <td>{report["Status To"] || "N/A"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
