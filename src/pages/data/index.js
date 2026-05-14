import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Report from "./report";
import { baseURL } from "../../const";
import { processFileData, HOLIDAYS_BY_YEAR, YELLOW_FIELDS } from "../../utils/dataProcessor";
import FloatingChatBot from "../../components/ChatBot/FloatingChatBot";
import { useCsvData } from "../../utils/apiHooks";

// Note: Most utility functions are now imported from dataProcessor.js

export const MainPages = () => {
  // Use React Query hooks for caching and API state management
  const { data: rawCsvData, isLoading, error: queryError, isError } = useCsvData();
  const [isDownloading, setIsDownloading] = useState(false);

  // Simplified function since heavy lifting is done in the utility - moved before useMemo
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

  // Process the raw CSV data and compute holidays using useMemo for performance
  const { csvData, holidays } = useMemo(() => {
    if (!rawCsvData) return { csvData: null, holidays: [] };

    console.log("Raw CSV Data received:", {
      numRows: rawCsvData.length - 1,
      firstRow: rawCsvData[0],
      sampleDataRow: rawCsvData[1]?.slice(0, 41),
    });

    // Always recompute using the same processing logic as the correct page.
    // This keeps ElapsedTime/Cumilative/Remaining Time consistent for every ticket.
    const processedData = processFileData(rawCsvData);
    
    if (!processedData || processedData.length === 0) {
      return { csvData: null, holidays: [] };
    }
    
    // Extract holidays from the processed data
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
    
    return { csvData: processedData, holidays: relevantHolidays };
  }, [rawCsvData]);

  // Determine error state and message (no upload condition - data loads from server by default)
  const error = useMemo(() => {
    if (isError && queryError) {
      return queryError.message || 'Error loading data from server.';
    }
    if (rawCsvData && !csvData) {
      return 'Failed to process data. Please check the file format.';
    }
    return null;
  }, [isError, queryError, rawCsvData, csvData]);

  // Build dataset for chatbot from backend API
  const chatDataset = useMemo(() => {
    // Chat dataset will be fetched from backend when needed by the chatbot
    return [];
  }, []);

  // Handle download full report
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const fileInfo = JSON.parse(localStorage.getItem('uploadedFile') || '{}');
      const filename = fileInfo?.serverFilename || 'data1.csv';
      
      const body = {
        filename,
        email: user?.email,
        name: user?.name,
        filters: {
          requestType: [],
          creationDateFrom: null,
          creationDateTo: null,
          priority: [],
          assignedTo: [],
          status: [],
          breached: [],
          marconaName: [],
          searchText: '',
          timeToBreachOption: 'eq',
          timeToBreachValue: ''
        },
        sort: {
          key: null,
          direction: 'asc'
        }
      };

      const response = await fetch(`${baseURL}/sla_breach/export_csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sla-full-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="w-full min-h-full bg-slate-50 flex justify-center items-center px-4 py-6 md:px-6">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 text-center">
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
      <div className="w-full min-h-full bg-slate-50 flex justify-center items-center px-4 py-6 md:px-6">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-8 text-center">
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
    <div className="w-full min-h-full bg-slate-50 px-4 py-4 md:px-6 md:py-6">
      <div className="w-full bg-white rounded-xl border border-slate-200 p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">
            SLA Monitoring
          </h1>
          
          {/* Download Full Report Button */}
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading || !csvData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
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
                Downloading...
              </>
            ) : (
              <>
                <svg 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
                Download Report
              </>
            )}
          </button>
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