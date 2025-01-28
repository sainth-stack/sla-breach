import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./index.css";
import { LLMConfig } from "../llm-config";

export const MainPages = () => {
  const [csvData, setCsvData] = useState(null);
  const [dateColumns, setDateColumns] = useState(
    "Creation_Time,Creation Time,startdate,Historical,Creation Time"
  );
  const [file, setFile] = useState(null);

  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          setCsvData(result.data);
          adjustDateColumns(result.data);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        },
        skipEmptyLines: true,
      });
    }
  };

  const handleDownload = () => {
    if (!csvData) return;

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fileData.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const adjustDateColumns = (csvData) => {
    if (!csvData || !dateColumns) return;

    const columnNames = dateColumns.split(",").map((col) => col.trim());
    const headers = csvData[0];

    const updatedData = csvData.map((row, rowIndex) => {
      if (rowIndex === 0) return row; // Skip headers
      return row.map((cell, cellIndex) => {
        const header = headers[cellIndex];
        if (columnNames.includes(header)) {
          try {
            const date = new Date(cell);
            if (!isNaN(date)) {
              date.setHours(date.getHours() - 6); // Subtract 6 hours
              const options = {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              };
              return date.toLocaleString("en-US", options);
            } else if (/\d{1,2}:\d{2}:\d{2} (AM|PM)/.test(cell)) {
              const [time, period] = cell.split(" ");
              const [hours, minutes, seconds] = time.split(":").map(Number);

              // Convert to 24-hour format
              let totalHours =
                period === "PM" && hours !== 12
                  ? hours + 12
                  : hours === 12 && period === "AM"
                  ? 0
                  : hours;

              // Create a Date object for today and set the time
              const currentDate = new Date();
              currentDate.setHours(totalHours, minutes, seconds, 0);

              // Subtract 6 hours
              currentDate.setHours(currentDate.getHours() - 6);

              // Format back to 12-hour time
              const reducedHours = currentDate.getHours();
              const reducedMinutes = currentDate.getMinutes();
              const reducedSeconds = currentDate.getSeconds();

              const formattedPeriod = reducedHours >= 12 ? "AM" : "PM";
              const formattedHours =
                reducedHours % 12 === 0 ? 12 : reducedHours % 12;
              const formattedMinutes = reducedMinutes
                .toString()
                .padStart(2, "0");
              const formattedSeconds = reducedSeconds
                .toString()
                .padStart(2, "0");

              return `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${formattedPeriod}`;
            }
          } catch {
            // Ignore errors in parsing
          }
        }
        return cell;
      });
    });

    setCsvData(updatedData);
  };

  const calculateReport = () => {
    if (!csvData) return null;

    const headers = csvData[0];
    const creationIndex = headers.indexOf("Historical Status_Status To");
    const suspendedIndex = headers.indexOf("Change");
    const change1 = csvData.filter(
      (item) => item[creationIndex] == "Suspended"
    );
    const change2 = csvData.filter((item) => item[creationIndex] == "Solved");
    const change3 = csvData.filter(
      (item) => item[creationIndex] == "Work in progress"
    );
    console.log(csvData);
    const data = {
      time1: getCumulativeTime(
        change1[0][suspendedIndex],
        change2[0][suspendedIndex],
        change3[0][suspendedIndex]
      ),
      time2: getCumulativeTime(
        change1[0][suspendedIndex],
        change2[0][suspendedIndex]
      ),
      ticket: csvData[1][4],
      priority: csvData[1][3],
    };
    return data;
  };

  function getCumulativeTime(time1, time2, time3) {
    // Convert time to seconds
    const toSeconds = (time) => {
      if (time) {
        const [h, m, s] = time?.split(":").map(Number);
        return h * 3600 + m * 60 + s;
      } else return null;
    };

    // Convert seconds back to time
    const toTime = (seconds) => {
      const h = Math.floor(seconds / 3600);
      // const m = Math.floor((seconds % 3600) / 60);
      // const s = seconds % 60;
      return `${h} hours`;
    };

    // Calculate total seconds and convert back to time
    const totalSeconds = toSeconds(time1) + toSeconds(time2) + toSeconds(time3);
    return toTime(totalSeconds);
  }

  const report = calculateReport();
  return (
    <div className="p-2 flex flex-col gap-2 items-start">
      <div className="card">
        <h1 className="heading">SLA Breach</h1>
        <div className="upload-section">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>
        <div className="column-input-section">
          {csvData && (
            <div className="data-section">
              <button onClick={handleDownload} className="download-button">
                Download File
              </button>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      {csvData[0]?.map((header, index) => (
                        <th key={index} className="table-header">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="table-cell">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {report && (
          <div className="report-section">
            <h2 className="report-heading">Report</h2>
            {/* <p className="report-text">Suspended Time - {report?.time2}</p> */}
            <table>
              <thead>
                <td>Ticket</td>
                <td>Priority</td>
                <td>Allowed Duration</td>
                <td>Elapsed Time</td>
                <td>Status To</td>
              </thead>
              <tbody>
              <td>{report?.priority}</td>
                <td>{report?.ticket}</td>
                <td>40</td>
                <td>{report?.time1}</td>
                <td>{report?.status}</td>
              </tbody>
            </table>
          </div>
        )}
      </div>
      {file && (
        <div style={{ width: "100%" }}>
          <LLMConfig file={file} />
        </div>
      )}
    </div>
  );
};
