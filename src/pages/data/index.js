import React, { useState, useEffect, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Report from "./report";
import { baseURL } from "../../const";
import { processFileData, HOLIDAYS_BY_YEAR, YELLOW_FIELDS } from "../../utils/dataProcessor";
import FloatingChatBot from "../../components/ChatBot/FloatingChatBot";

// Note: Most utility functions are now imported from dataProcessor.js

export const MainPages = () => {
  const [csvData, setCsvData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState(null);

  // Function to load data by filename from API
  const loadDataByFilename = async (filename) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseURL}/get_csv_data/${filename}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(`File '${filename}' not found. Please check the filename and try again.`);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Error loading data from server.');
        }
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        // Convert the API response back to array format for processing
        const headers = Object.keys(data.records[0]);
        const rows = data.records.map(record => headers.map(header => record[header]));
        const processedData = [headers, ...rows];
        processData(processedData);
        return true;
      } else {
        setError('No data found in the file. Please upload a valid file.');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      console.error('Error loading data from API:', err);
      setError('Error connecting to server. Please try again later.');
      setIsLoading(false);
      return false;
    }
  };

  // Auto-load data from API on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // First check if we have an uploaded file info to get the filename
        const uploadedFileInfo = localStorage.getItem('uploadedFile');
        let filename = 'data1.csv'; // Default filename
        
        if (uploadedFileInfo) {
          const fileInfo = JSON.parse(uploadedFileInfo);
          // Use serverFilename if available, otherwise fallback to default
          filename = fileInfo.serverFilename || 'data1.csv';
        }

        // Use the reusable function to load data
        const success = await loadDataByFilename(filename);
        if (!success) {
          // Error handling is already done in loadDataByFilename
          console.log('Failed to load initial data');
        }
      } catch (err) {
        console.error('Error in initial data load:', err);
        setError('Error loading initial data. Please try again.');
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Simplified function since heavy lifting is done in the utility
  const getHolidaysForYears = (years) => {
    const uniqueYears = [...new Set(years)];
    const allHolidays = [];
    
    uniqueYears.forEach(year => {
      if (HOLIDAYS_BY_YEAR[year]) {
        allHolidays.push(...HOLIDAYS_BY_YEAR[year]);
      }
    });
    console.log(allHolidays,'all holidays')
    return allHolidays;
  };


  const processData = (data) => {
    if (!data || data.length === 0) return;
    
    // Use the utility function to process the data
    const processedData = processFileData(data);
    
    if (!processedData || processedData.length === 0) {
      setError('Failed to process data. Please check the file format.');
      setIsLoading(false);
      return;
    }
    
    // Extract holidays from the processed data for state management
    const [headers, ...rows] = processedData;
    const years = [];
    const reqCreationDateIndex = headers.indexOf("Req. Creation Date");
    const historicalChangeDateIndex = headers.indexOf("Historical Status - Change Date");
    
    rows.forEach(row => {
      if (reqCreationDateIndex !== -1 && row[reqCreationDateIndex]) {
        const dateParts = row[reqCreationDateIndex].split('/');
        if (dateParts.length === 3) {
          years.push(dateParts[2]);
        }
      }
      if (historicalChangeDateIndex !== -1 && row[historicalChangeDateIndex]) {
        const dateParts = row[historicalChangeDateIndex].split('/');
        if (dateParts.length === 3) {
          years.push(dateParts[2]);
        }
      }
    });
    
    const relevantHolidays = getHolidaysForYears(years);
    setHolidays(relevantHolidays);

    setCsvData(processedData);
    setIsLoading(false);
  };

  // Build dataset for chatbot from processed table (grouped by ticket) - memoized
  const chatDataset = useMemo(() => {
    if (!csvData) return [];
    try {
      const [headers, ...rows] = csvData;
      if (!headers || rows.length === 0) return [];

      const COLUMNS = {
        CREATION_DATE: 0,
        TICKET_ID: 3,
        PRIORITY: 4,
        STATUS_FROM: 5,
        STATUS_TO: 6,
        STATUS_CHANGE_DATE: 7,
        MARCO: 9,
        ASSIGNED_TO: 13,
        CURRENT_STATUS: 15,
        ELAPSED_TIME: 32,
        resolSW: 33,
        RESP_REM: 35,
        REQ_STATUS: headers.indexOf("Req. Status - Description"),
        RESOLUTION_DATE: headers.indexOf("Req. Resolution Date"),
        REQUEST_TYPE: headers.indexOf("Req. Type - Description EN")
      };

      const groups = new Map();
      rows.forEach((row) => {
        const id = row[COLUMNS.TICKET_ID];
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(row);
      });

      const dataset = [];
      for (const [, ticketRows] of groups) {
        const lastRow = ticketRows[ticketRows.length - 1];
        const respRemVal = parseFloat(lastRow?.[COLUMNS.RESP_REM]);
        dataset.push({
          ticketId: lastRow?.[COLUMNS.TICKET_ID],
          creationDate: lastRow?.[COLUMNS.CREATION_DATE],
          priority: lastRow?.[COLUMNS.PRIORITY],
          assignedTo: lastRow?.[COLUMNS.ASSIGNED_TO],
          marconaName: lastRow?.[COLUMNS.MARCO],
          currentStatus: lastRow?.[COLUMNS.CURRENT_STATUS],
          elapsedTime: lastRow?.[COLUMNS.ELAPSED_TIME],
          isBreached: !isNaN(respRemVal) ? respRemVal < 0 : false,
          status: COLUMNS.REQ_STATUS !== -1 ? lastRow?.[COLUMNS.REQ_STATUS] : undefined,
          resolutionDate: COLUMNS.RESOLUTION_DATE !== -1 ? lastRow?.[COLUMNS.RESOLUTION_DATE] : undefined,
          timeToBreach: lastRow?.[COLUMNS.RESP_REM],
          totalTime: lastRow?.[COLUMNS.resolSW],
          requestType: COLUMNS.REQUEST_TYPE !== -1 ? lastRow?.[COLUMNS.REQUEST_TYPE] : undefined,
        });
      }
      return dataset;
    } catch (e) {
      console.error('Failed to build chat dataset:', e);
      return [];
    }
  }, [csvData]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-12 w-12 text-indigo-600"
              xmlns="http://www.w3.org/2000/svg"
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
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Processing Data</h2>
          <p className="text-gray-600">Please wait while we load and process your SLA data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-4">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/data-source'}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 font-semibold"
          >
            Go to Data Source
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6">
      <div className="w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">
            SLA Monitoring
          </h1>

        </div>

        {csvData && (
          <div className="space-y-6">
            <Report data={csvData}/>
          </div>
        )}
      </div>
      
      {/* Floating Chat Bot */}
      {csvData && (
        <FloatingChatBot
          title="SLA Data Analysis"
          subtitle="Ask questions about your SLA data"
          placeholder="Ask about SLA metrics, trends, performance..."
          endpoint="/Explore_sla/"
          initialMessage="Hello! I can help you analyze your SLA data. You can ask me about metrics, trends, performance issues, and get detailed insights from your uploaded data. What would you like to explore?"
          showFileInfo={true}
          showSessionInfo={true}
          className="sla-data-chatbot"
          dataset={chatDataset}
        />
      )}
    </div>
  );
};