import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import "./index.css";
import { LLMConfig } from "../llm-config";
import * as XLSX from 'xlsx';

export const MainPages = () => {
  const [csvData, setCsvData] = useState(null);
  const [csvData2, setCsvData2] = useState(null);
  const [dateColumns, setDateColumns] = useState(
    "Creation Time,Historical Status - Change Time"
  );
  const [file, setFile] = useState(null);
  const [filters, setFilters] = useState({
    ticket: '',
    assignedTo: '',
    priority: '',
    allowedDuration: '',
    breached: '',
    status: '',
    creationDateFrom: '',
    creationDateTo: '',
    timeToBreachOption: 'eq',
    timeToBreachValue: ''
  });
  const calculateWorkingHours = (data1) => {
    console.log(data1)
    const addColumns = (data) => {
        // Add only Change column
        const changeIndex = data[0].length;
        
        // Add header
        data[0][changeIndex] = "Change";
        
        // Add empty values for all rows
        for (let i = 1; i < data.length; i++) {
            data[i][changeIndex] = "";
        }
        return data;
    };

    const data = addColumns(data1);

    const workingHoursStart = 14; // 2 PM
    const workingHoursEnd = 23; // 11 PM

    const parseDateTime = (dateTimeString, timeStr) => {
        try {
            // Case 1: When date and time are passed separately (original CSV format)
            if (timeStr !== undefined) {
                const [day, month, year] = dateTimeString.split("/");
                const [hours, minutes] = timeStr.split(":");
                return new Date(`20${year}`, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0);
            }

            // Case 2: When it's a combined string (CSV format "DD/MM/YY HH:MM")
            if (typeof dateTimeString === 'string' && dateTimeString.includes('/')) {
                const [datePart, timePart] = dateTimeString.split(" ");
                const [day, month, year] = datePart.split("/");
                const [hours, minutes] = timePart.split(":");
                return new Date(`20${year}`, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0);
            }

            // Case 3: When it's an Excel date (number or Date object)
            if (dateTimeString instanceof Date) {
                return dateTimeString;
            }
            if (typeof dateTimeString === 'number') {
                return new Date(Math.round((dateTimeString - 25569) * 86400 * 1000));
            }

            // Fallback: Try to parse as is
            return new Date(dateTimeString);
        } catch (error) {
            console.error("Error parsing date:", error, "Input:", dateTimeString, timeStr);
            return new Date(); // Return current date as fallback
        }
    };

    const isWeekend = (date) => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
    };

    const calculateTimeDifference = (startDateTime, endDateTime) => {
        let start = new Date(startDateTime);
        let end = new Date(endDateTime);
        let reason = [];
        let totalHours = 0;

        // If same day and both on weekend
        if (start.toDateString() === end.toDateString() && isWeekend(start)) {
            reason.push("Weekend day - no hours counted");
            return { hours: 0, reason: reason.join(". "), start, end };
        }

        // Iterate through each day between start and end
        let currentDate = new Date(start);
        while (currentDate <= end) {
            if (!isWeekend(currentDate)) {
                let dayStart = new Date(currentDate);
                let dayEnd = new Date(currentDate);
                
                // Set working hours boundaries
                dayStart.setHours(workingHoursStart, 0, 0);
                dayEnd.setHours(workingHoursEnd, 0, 0);

                // Adjust start time for first day
                if (currentDate.toDateString() === start.toDateString()) {
                    if (start.getHours() >= workingHoursEnd) {
                        // Skip this day if start is after working hours
                        currentDate.setDate(currentDate.getDate() + 1);
                        continue;
                    }
                    dayStart = start.getHours() < workingHoursStart ? dayStart : start;
                }

                // Adjust end time for last day
                if (currentDate.toDateString() === end.toDateString()) {
                    if (end.getHours() < workingHoursStart) {
                        break;
                    }
                    dayEnd = end.getHours() >= workingHoursEnd ? dayEnd : end;
                }

                // Calculate hours for this day
                if (dayEnd > dayStart) {
                    const diffMs = dayEnd - dayStart;
                    const hoursToday = diffMs / (1000 * 60 * 60);
                    totalHours += hoursToday;
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add explanation to reason
        if (totalHours > 0) {
            if (isWeekend(start)) {
                reason.push("Start date was on weekend - counting started from next working day");
            }
            if (isWeekend(end)) {
                reason.push("End date was on weekend - counting ended on previous working day");
            }
            reason.push("Counted working hours between valid working days");
        } else {
            reason.push("No valid working hours found between dates");
        }

        return {
            hours: totalHours,
            reason: reason.join(". "),
            start,
            end
        };
    };

    // Group by ticket ID and status
    const ticketGroups = {};
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const ticketId = row[3]; // Request-ID column
        const statusFrom = row[5]; // Historical Status - Status From
        const statusTo = row[6];   // Historical Status - Status To
        
        if (!ticketGroups[ticketId]) {
            ticketGroups[ticketId] = [];
        }
        ticketGroups[ticketId].push({
            row: row,
            date: parseDateTime(row[7], row[8]),
            statusFrom: statusFrom,
            statusTo: statusTo
        });
    }
    // Process each ticket's records
    for (const ticketId in ticketGroups) {
        const records = ticketGroups[ticketId].sort((a, b) => a.date - b.date);

        for (let i = 0; i < records.length; i++) {
            const currentRecord = records[i];
            let result = { hours: 0, reason: "", start: null, end: null };

            if (i === 0) {
                if (currentRecord.date.getHours() >= workingHoursStart) {
                    const startTime = new Date(currentRecord.date);
                    startTime.setHours(workingHoursStart, 0, 0);
                    result = calculateTimeDifference(startTime, currentRecord.date);
                } else {
                    result.reason = "First record before working hours";
                    result.start = currentRecord.date;
                    result.end = currentRecord.date;
                }
            } else {
                const prevRecord = records[i - 1];
                result = calculateTimeDifference(prevRecord.date, currentRecord.date);
            }

            // Format the time
            const hours = Math.floor(result.hours);
            const minutes = Math.round((result.hours - hours) * 60);
            
            // Find the index for Change column
            const changeIndex = currentRecord.row.length - 1;
            
            // Set the Change column
            currentRecord.row[changeIndex] = 
                `${hours}:${minutes.toString().padStart(2, '0')} h`;
        }
    }
console.log(data)
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
  "Change",
  // "Details"
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


const validTransitions = [
  "Forwarded to Assigned",
  "Forwarded to Work in progress",
  "Assigned to Work in progress",
  "Work in progress to Suspended",
  "Work in progress to Solved",
  "Suspended to Solved",
  "Forwarded to Suspended"
];
setCsvData([allowedHeaders,...filteredData]);

const statusFromIndex = headers.indexOf("Historical Status - Status From")-1;
const statusToIndex = headers.indexOf("Historical Status - Status To")-1;
  const finalData=[...filteredData].filter((item)=>{
    const transition = `${item[statusFromIndex]} to ${item[statusToIndex]}`;
if (validTransitions.includes(transition)) {
  return true
}
  })
console.log(finalData,'sss')
  setCsvData2([allowedHeaders,...finalData]);
};


  const handleFileUpload = (event) => {
    setFile(event.target.files[0]);
    const file = event.target.files?.[0];
    if (!file) return;

    // Handle different file types based on extension
    const fileExtension = file?.name?.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (result) => {
          calculateWorkingHours(sortData(adjustDateColumns(result.data, dateColumns)));
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        },
        skipEmptyLines: true,
      });
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        calculateWorkingHours(sortData(adjustDateColumns(excelData, dateColumns)));
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error("Unsupported file type");
    }
  };

const sortData = (data) => {

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


const parseDateTime = (dateTimeString, timeStr) => {
    try {
        // Case 1: When date and time are passed separately (original CSV format)
        if (timeStr !== undefined) {
            const [day, month, year] = dateTimeString.split("/");
            const [hours, minutes] = timeStr.split(":");
            return new Date(`20${year}`, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0);
        }

        // Case 2: When it's a combined string (CSV format "DD/MM/YY HH:MM")
        if (typeof dateTimeString === 'string' && dateTimeString.includes('/')) {
            const [datePart, timePart] = dateTimeString.split(" ");
            const [day, month, year] = datePart.split("/");
            const [hours, minutes] = timePart.split(":");
            return new Date(`20${year}`, month - 1, day, parseInt(hours, 10), parseInt(minutes, 10), 0);
        }

        // Case 3: When it's an Excel date (number or Date object)
        if (dateTimeString instanceof Date) {
            return dateTimeString;
        }
        if (typeof dateTimeString === 'number') {
            return new Date(Math.round((dateTimeString - 25569) * 86400 * 1000));
        }

        // Fallback: Try to parse as is
        return new Date(dateTimeString);
    } catch (error) {
        console.error("Error parsing date:", error, "Input:", dateTimeString, timeStr);
        return new Date(); // Return current date as fallback
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
    if (!csvData2 || csvData2.length < 2) return null;
    
    const prioritySLA = {
        "P1 - Critical": 4,
        "P2 - High": 8,
        "P3 - Normal": 45,
        "P4 - Low": 90
    };


    const headers = csvData2[0];
    const statusFromIndex = headers.indexOf("Historical Status - Status From");
    const statusToIndex = headers.indexOf("Req. Status - Description");
    const requestIdIndex = headers.indexOf("Request - ID");
    const changeIndex = headers.indexOf("Change");
    const ticketIndex = headers.indexOf("Request - ID");
    const priorityIndex = headers.indexOf("Request - Priority Description");
    const assignedTo = headers.indexOf("Request - Resource Assigned To - Name");
    const creationDateIndex = headers.indexOf("Historical Status - Change Date");

    // Group data by request ID (removed date filtering)
    const groupedData = csvData2.slice(1).reduce((acc, item) => {
        const requestId = item[requestIdIndex];
        if (!acc[requestId]) {
            acc[requestId] = [];
        }
 
            acc[requestId].push(item);
        return acc;
    }, {});

    const reports = Object.entries(groupedData).map(([requestId, records]) => {
        if(records?.length>0){
            // ... rest of the report calculation logic remains the same ...
            const lastRecord = records[records.length - 1];
            const status = lastRecord?.length>0 ?lastRecord[statusToIndex]:'';
            const priority = lastRecord[priorityIndex];
            const slaHours = prioritySLA[priority] || 40;

            const elapsedTime = records.reduce((sum, record) => {
                const timeParts = record[changeIndex]?.split(':');
                let timeInHours = 0;
                if (timeParts?.length === 2) {
                    const hours = parseInt(timeParts[0], 10) || 0;
                    const minutes = parseInt(timeParts[1], 10) || 0;
                    timeInHours = hours + minutes / 60;
                } else {
                    timeInHours = parseFloat(record[changeIndex]) || 0;
                }
                return sum + timeInHours;
            }, 0);

            const hours = Math.floor(elapsedTime);
            const minutes = Math.round((elapsedTime - hours) * 60);
            const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}`;

            const timeToBreachHours = slaHours - elapsedTime;
            const breachHours = Math.floor(Math.abs(timeToBreachHours));
            const breachMinutes = Math.round((Math.abs(timeToBreachHours) - breachHours) * 60);
            const timeToBreach = timeToBreachHours >= 0 
                ? `${breachHours}:${breachMinutes.toString().padStart(2, '0')}`
                : `0:00`;

            return {
                requestId,
                ticket: lastRecord[ticketIndex],
                priority,
                status,
                date:lastRecord[creationDateIndex],
                elapsedTime: formattedTime,
                breached: elapsedTime > slaHours,
                totalTime: slaHours,
                assignedTo: lastRecord[assignedTo],
                timeToBreach
            };
        }
    }).filter(Boolean); // Remove any undefined entries

    return reports;
};

const getFilteredReport = () => {
    if (!report) return [];
    
    const parseTimeToBreachValue = (timeStr) => {
        timeStr = timeStr.replace(/\s*h\s*$/, '').trim();
        const isNegative = timeStr.startsWith('-');
        const hours = parseInt(timeStr.replace('-', '').split(':')[0], 10);
        return isNegative ? -hours : hours;
    };

    return report
        .filter(item => {
            if (!item) return false;
            
            // Creation date filtering
            if (filters.creationDateFrom || filters.creationDateTo) {
                const creationDate = new Date(item.date.split('/').reverse().join('-'));
                
                if (filters.creationDateFrom) {
                    const fromDate = new Date(filters.creationDateFrom);
                    fromDate.setHours(0, 0, 0, 0);
                    if (creationDate < fromDate) return false;
                }

                if (filters.creationDateTo) {
                    const toDate = new Date(filters.creationDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (creationDate > toDate) return false;
                }
            }

            // Other filters remain the same
            if (filters.ticket && item.requestId !== filters.ticket) return false;
            if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
            if (filters.priority && item.priority !== filters.priority) return false;
            if (filters.breached && item.breached.toString() !== filters.breached) return false;
            if (filters.status && item.status !== filters.status) return false;
            
            // Time to breach filtering
            if (filters.timeToBreachValue) {
                const itemHours = parseTimeToBreachValue(item.timeToBreach);
                const filterHours = parseInt(filters.timeToBreachValue, 10);

                switch (filters.timeToBreachOption) {
                    case 'eq':
                        if (itemHours !== filterHours) return false;
                        break;
                    case 'lte':
                        if (itemHours > filterHours) return false;
                        break;
                    case 'gte':
                        if (itemHours < filterHours) return false;
                        break;
                }
            } 
            return true;
        })
        .sort((a, b) => {
            return parseTimeToBreachValue(a.timeToBreach) - parseTimeToBreachValue(b.timeToBreach);
        });
};

      const parseDate = (dateStr) => {
          if (!dateStr) return null;
          
          try {
              // For DD/MM/YY format from CSV
              if (dateStr.includes('/')) {
                  const [day, month, year] = dateStr.split('/');
                  const date = new Date(`20${year}`, month - 1, day);
                  // Check if date is valid
                  if (isNaN(date.getTime())) return null;
                  return date;
              }
              
              // For YYYY-MM-DD format from input date field
              const date = new Date(dateStr);
              // Check if date is valid
              if (isNaN(date.getTime())) return null;
              return date;
          } catch (error) {
              console.error('Error parsing date:', error);
              return null;
          }
      };

    const report = calculateReport();

  const getUniqueValues = (data, key) => {
    if (!data) return [];
    return [...new Set(data.filter(item => item).map(item => item[key]))];
  };

  return (
    <div className="p-2 flex flex-col gap-2 items-start">
      <div className="card2">
        <h1 className="heading">SLA Breach</h1>
        <div className="upload-section2">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="file-input2"
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
            <div className="filters-container grid grid-cols-4 gap-4 mb-4">
              <div>
                <label>Creation Date From:</label>
                <input 
                  type="date" 
                  value={filters.creationDateFrom}
                  onChange={(e) => setFilters({...filters, creationDateFrom: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label>Creation Date To:</label>
                <input 
                  type="date" 
                  value={filters.creationDateTo}
                  onChange={(e) => setFilters({...filters, creationDateTo: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label>Priority:</label>
                <select 
                  value={filters.priority} 
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  {getUniqueValues(report, 'priority').map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <div>
                  <label>Time to Breach:</label>
                  <select 
                    value={filters.timeToBreachOption} 
                    onChange={(e) => setFilters({...filters, timeToBreachOption: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="eq">Equal to</option>
                    <option value="lte">Less than or equal to</option>
                    <option value="gte">Greater than or equal to</option>
                  </select>
                </div>
                <div>
                  <input 
                    type="number" 
                    value={filters.timeToBreachValue}
                    onChange={(e) => setFilters({...filters, timeToBreachValue: e.target.value})}
                    placeholder="Enter hours"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label>Ticket:</label>
                <select 
                  value={filters.ticket} 
                  onChange={(e) => setFilters({...filters, ticket: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  {getUniqueValues(report, 'requestId').map(ticket => (
                    <option key={ticket} value={ticket}>{ticket}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Assigned To:</label>
                <select 
                  value={filters.assignedTo} 
                  onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  {getUniqueValues(report, 'assignedTo').map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Status:</label>
                <select 
                  value={filters.status} 
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  {getUniqueValues(report, 'status').map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Breached:</label>
                <select 
                  value={filters.breached} 
                  onChange={(e) => setFilters({...filters, breached: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            
            {/* Add total records count */}
            <div className="mb-4 text-sm font-medium">
              Total Records: {getFilteredReport().length}
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Assigned To</th>
                  <th>Priority</th>
                  <th>Elapsed Time</th>
                  <th>Time to Breach</th>
                  <th>Breached</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredReport().map((item, index) => {
                   return(
                    <>
                     {item &&
                      <tr key={index}>
                        <td>{item.requestId}</td>
                        <td>{item.assignedTo}</td>
                        <td>{item.priority}</td>
                        <td>{item.elapsedTime} h</td>
                        <td>{item.timeToBreach} h</td>
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
