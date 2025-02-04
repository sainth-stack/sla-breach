import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./index.css";
import { LLMConfig } from "../llm-config";

export const MainPages = () => {
  const [csvData, setCsvData] = useState(null);
  const [csvData2, setCsvData2] = useState(null);
  const [dateColumns, setDateColumns] = useState(
    "Creation Time,Historical Status - Change Time"
  );
  const [file, setFile] = useState(null);
  const calculateWorkingHours = (data1) => {
    console.log(data1);

    const addChangeColumn = (data) => {
        data[0].push("Change");
        for (let i = 1; i < data.length; i++) {
            data[i].push("");
        }
        return data;
    };

    const data = addChangeColumn(data1);

    const workingHoursStart = 14; // 2 PM
    const workingHoursEnd = 23; // 11 PM

    const parseDateTime = (dateStr, timeStr) => {
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        return new Date(year, month - 1, day, hours, minutes, 0); // Ignore seconds
    };

    const calculateDecimalHours = (startTime, endTime) => {
        const diffInMilliseconds = endTime - startTime;
        const diffInMinutes = diffInMilliseconds / (1000 * 60); // Time in minutes
        return diffInMinutes / 60; 
    };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const startDateTime = parseDateTime(row[7], "14:00:00");
        const endDateTime = parseDateTime(row[7], row[8]);   

        if (startDateTime.getHours() > parseDateTime(row[7], row[8]).getHours() || endDateTime.getHours() > workingHoursEnd) {
            row[row.length - 1] = "0.00 h";
        } else {
            const totalWorkingHours = calculateDecimalHours(startDateTime, endDateTime);
            const hours = Math.floor(totalWorkingHours);
            const minutes = Math.round((totalWorkingHours - hours) * 60);
            row[row.length - 1] = `${hours}.${minutes.toString().padStart(2, '0')} h`;
        }
    }

    updateTemplate(data);
};


const allowedHeaders = [
  "Req. Creation Date",
  "Creation Time",
  "Request - ID",
  "Request - Priority Description",
  "Historical Status - Status From",
  "Historical Status - Status To",
  "Historical Status - Change Date",
  "Historical Status - Change Time",
  "Macro Area - Name",
  "Request - Resource Assigned To - Name",
  "Req. Status - Description",
  "Change"
];

const updateTemplate = (data) => {
  // Extract headers and values
  const headers = data[0]; // First row contains headers
  const values = data.slice(1); // Remaining rows contain values

  // Get the indices of required headers
  const allowedIndices = headers
    .map((header, index) => (allowedHeaders.includes(header) ? index : -1))
    .filter(index => index !== -1); // Remove -1 (unwanted headers)

  // Create filtered data with only allowed columns
  const filteredData = values.map(row => allowedIndices.map(index => row[index]));

  // Set the filtered data, including the headers
  setCsvData([allowedHeaders, ...filteredData]);
};


  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          calculateWorkingHours(sortData(adjustDateColumns(result.data,dateColumns)));
      },      
        error: (error) => {
          console.error("Error parsing CSV:", error);
        },
        skipEmptyLines: true,
      });
    }
  };

const sortData = (data) => {
    console.log(data);

    const header = data[0];
    const rows = data.slice(1);

    const groupedData = rows.reduce((acc, row) => {
        if (!acc[row[3]]) acc[row[3]] = [];
        acc[row[3]].push(row);
        return acc;
    }, {});


    Object.keys(groupedData).forEach(id => {
        groupedData[id].sort((a, b) => {
            const dateA = parseDateTime(`${a[7]} ${a[8]}`);
            const dateB = parseDateTime(`${b[7]} ${b[8]}`);
            return dateA - dateB;
        });
    });

    const sortedData = [header, ...Object.values(groupedData).flat()];

    return sortedData;
};


const parseDateTime = (dateTimeString) => {
  const [datePart, timePart] = dateTimeString.split(" ");
  const [day, month, year] = datePart.split("/");
  let [hours, minutes] = timePart.split(":");
  const date = new Date(`20${year}`, month - 1, day);
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  return date;
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

  const adjustDateColumns = (csvData, dateColumns) => {
    if (!csvData || !dateColumns) return csvData;
  
    const columnNames = dateColumns.split(",").map((col) => col.trim());
    const headers = csvData[0];
  
    const updatedData = csvData.map((row, rowIndex) => {
      if (rowIndex === 0) return row; // Skip headers
    
      return row.map((cell, cellIndex) => {
        const header = headers[cellIndex];
        if (columnNames.includes(header)) {
          try {
            let totalHours, minutes, seconds;
    
            // Handle time strings in "HH:MM:SS" format
            if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(cell)) {
              [totalHours, minutes, seconds] = cell.split(":").map(Number);
            }
            // Handle time strings in "HHMMSS" format (including 5-digit correction)
            else if (/^\d{5,6}$/.test(cell)) {
              let timeStr = cell.padStart(6, "0"); // Ensure it's 6 digits
              totalHours = parseInt(timeStr.substring(0, 2), 10);
              minutes = parseInt(timeStr.substring(2, 4), 10);
              seconds = parseInt(timeStr.substring(4, 6), 10);
            } else {
              return cell; // Return original value if format is unrecognized
            }
    
            // Format to HH:mm:ss
            const formattedHours = String(totalHours).padStart(2, "0");
            const formattedMinutes = String(minutes).padStart(2, "0");
            const formattedSeconds = String(seconds).padStart(2, "0");
    
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
          } catch (error) {
            console.error("Error parsing date:", error);
          }
        }
        return cell; // Return the cell as-is if it's not a date column or parsing fails
      });
    });
    
  
    return updatedData;
  };
  
  const calculateReport = () => {
    if (!csvData || csvData.length < 2) return null;
    
    const prioritySLA = {
        "P1 - Critical": 4,
        "P2 - High": 8,
        "P3 - Normal": 45,
        "P4 - Low": 90
    };

    const validTransitions = [
      "Forwarded to Assigned",
      "Forwarded to Work in progress",
      "Assigned to Work in progress",
      "Work in progress to Suspended",
      "Work in progress to Solved",
      "Suspended to Solved",
      "Forwarded to Suspended"
    ];

    const headers = csvData[0];
    const statusFromIndex = headers.indexOf("Historical Status - Status From");
    const statusToIndex = headers.indexOf("Historical Status - Status To");
    const requestIdIndex = headers.indexOf("Request - ID");
    const changeIndex = headers.indexOf("Change");
    const ticketIndex = headers.indexOf("Request - ID");
    const priorityIndex = headers.indexOf("Request - Priority Description");
    const assignedTo = headers.indexOf("Request - Resource Assigned To - Name");

    const groupedData = csvData.slice(1).reduce((acc, item) => {
        const requestId = item[requestIdIndex];
        if (!acc[requestId]) {
            acc[requestId] = [];
        }
        const transition = `${item[statusFromIndex]} to ${item[statusToIndex]}`;
        if (validTransitions.includes(transition)) {
            acc[requestId].push(item);
        }
        return acc;
    }, {});
    const reports = Object.entries(groupedData).map(([requestId, records]) => {
        if(records?.length>0){
          const lastRecord = records[records.length - 1];
          const status = lastRecord?.length>0 ?lastRecord[statusToIndex]:'';
          const priority = lastRecord[priorityIndex];
          const slaHours = prioritySLA[priority] || 40; // Default to 40 if priority not found

          const elapsedTime = records.reduce((sum, record) => {
              const time = parseFloat(record[changeIndex]) || 0;
              return sum + time;
          }, 0);

          return {
              requestId,
              ticket: lastRecord[ticketIndex],
              priority,
              status,
              elapsedTime: elapsedTime.toFixed(2),
              breached: elapsedTime > slaHours,
              totalTime: slaHours,
              assignedTo:lastRecord[assignedTo]
          };
        }
    });
    return reports;
  };

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
        {report && report?.length > 0 && (
          <div className="report-section">
            <h2 className="report-heading">Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Allowed Duration</th>
                  <th>Elapsed Time</th>
                  <th>Breached</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report?.map((item, index) => {
                   return(
                    <>
                     {item &&
                      <tr key={index}>
                        <td>{item.requestId}</td>
                        <td>{item.assignedTo}</td>
                        <td>{item.priority}</td>
                        <td>{item.totalTime} h</td>
                        <td>{item.elapsedTime} h</td>
                        <td>{item.breached ? "Yes" : "No"}</td>
                        <td>{item.status}</td>
                      </tr>
                }
                    </>
                   )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div> 
    </div>
  );
};
