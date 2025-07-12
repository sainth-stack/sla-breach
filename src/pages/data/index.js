import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Report from "./report";
import { isSuperAdmin } from "../../utils/auth";
import S3Service from "../../utils/s3Service";

// Constants
const YELLOW_FIELDS = [
  "ResolSLA",
  "RespSLA",
  "ReqComp",
  "ReqCrDtConc",
  "EnDtConc",
  "HisChDtTiConc",
  "ElapsedTime",
  "CalcPreDt",
  "RefinedPreDt",
  "CalcStDt",
  "RefinedStDt",
  "Cumilative",
  "ResolSOW",
  "RespSOW",
  "ResolRem",
  "RespRem",
  "Rollover",
  "ReqCrYM",
  "DateRollover",
  "DateReqCrYM"
];

// Holiday data for multiple years (2021-2025)
const HOLIDAYS_BY_YEAR = {
  "2024": [
    "2024-01-01",
    "2024-01-14",
    "2024-01-26",
    "2024-03-29",
    "2024-04-02",
    "2024-04-13",
    "2024-04-14",
    "2024-04-21",
    "2024-06-02",
    "2024-08-15",
    "2024-09-10",
    "2024-10-02",
    "2024-10-31",
    "2024-12-25"
  ],
  "2025": [
    "2025-01-01",
    "2025-01-14",
    "2025-02-27",
    "2025-03-31",
    "2025-05-01",
    "2025-08-15",
    "2025-08-27",
    "2025-10-02",
    "2025-10-21",
    "2025-12-25"
  ]
};

const SLA_TABLE = {
  P1: { respsow: 0.5, resolsow: 4 },
  P2: { respsow: 2, resolsow: 9 },
  P3: { respsow: 9, resolsow: 45 },
  P4: { respsow: 18, resolsow: 90 },
};

const WORK_HOURS = {
  start: "14:00:00",
  end: "23:00:00",
};

const dateUtils = {
  excelSerialToDate: (serial) => {
    if (!serial || isNaN(serial)) return null;
    const excelEpoch = new Date(1900, 0, 1);
    const days = Math.floor(serial) - 2;
    return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  },

  formatTime: (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return "00:00:00";
    timeStr = timeStr.replace(/[^0-9]/g, "").padStart(6, "0");
    return timeStr.length >= 6
      ? `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`
      : "00:00:00";
  },

  formatDate: (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "";
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
      date.getDate()
    ).padStart(2, "0")}/${date.getFullYear()}`;
  },

  parseDateTime: (dateVal, timeStr, index) => {
    try {
      let date;
      if (typeof dateVal === "number") {
        date = dateUtils.excelSerialToDate(dateVal);
      } else if (typeof dateVal === "string") {
        const datePart = dateVal?.split(" ")[0];
        const [day, month, year] = datePart.split('/');
        const swappedDate = `${month}/${day}/${year}`;
        date = new Date(swappedDate);
      } else {
        date = new Date(dateVal);
      }
      if (!date || isNaN(date)) return null;
      const time = dateUtils.formatTime(timeStr);
      return new Date(`${dateUtils.formatDate(date)} ${time}`);
    } catch (e) {
      console.error("Error parsing date/time:", e);
      return null;
    }
  },

  convertExcelDate: (excelDate) => {
    if (typeof excelDate === "string" && excelDate.includes("/")) {
      return excelDate;
    }
    if (typeof excelDate === "number") {
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date.toLocaleDateString("en-GB");
    }
    return dateUtils.formatDate(excelDate);
  },
};

const calculationUtils = {
  excelMod: (date) => date - Math.floor(date),

  excelMedian: (a, b, c) => [a, b, c].sort((x, y) => x - y)[1],

  networkDaysIntl: (startDate, endDate, holidays = []) => {
    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return 0;

    const holidayDates = holidays.map((holiday) =>
      new Date(holiday).setHours(0, 0, 0, 0)
    );
    let days = 0;
    let current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const day = current.getDay();
      const currentTime = current.setHours(0, 0, 0, 0);
      if (day !== 0 && day !== 6 && !holidayDates.includes(currentTime)) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  },

  calculateWorkingHours: (
    startDate,
    endDate,
    workStartTimeStr,
    workEndTimeStr,
    holidays
  ) => {
    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return 0;
    if (endDate < startDate) return 0;

    const [workStartHours, workStartMinutes] = workStartTimeStr
      .split(":")
      .map(Number);
    const [workEndHours, workEndMinutes] = workEndTimeStr
      .split(":")
      .map(Number);

    const workDayStart = workStartHours + workStartMinutes / 60;
    const workDayEnd = workEndHours + workEndMinutes / 60;
    const workDayLength = workDayEnd - workDayStart;

    const networkDays = calculationUtils.networkDaysIntl(
      startDate,
      endDate,
      holidays
    );

    if (networkDays === 0) return 0;

    const getMedTime = (date) => {
      const hours = date.getHours() + date.getMinutes() / 60;

      if (!isWorkingDay(date, holidays)) {
        return workDayEnd;
      }

      return Math.max(workDayStart, Math.min(hours, workDayEnd));
    };

    const startMedTime = isWorkingDay(startDate, holidays)
      ? getMedTime(startDate)
      : workDayStart;

    const endMedTime = isWorkingDay(endDate, holidays) ? getMedTime(endDate) : workDayEnd;

    const fullDaysPart = (networkDays - 1) * workDayLength;

    const result = (fullDaysPart + (endMedTime - startMedTime)) * 24;
    return parseFloat(result.toFixed(8));
  },

  calculatePreDt: (
    startDate,
    endDate,
    workStartTimeStr,
    workEndTimeStr,
    holidays,
    index
  ) => {
    if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) return 0;

    const [workStartHours, workStartMinutes] = workStartTimeStr
      .split(":")
      .map(Number);
    const [workEndHours, workEndMinutes] = workEndTimeStr
      .split(":")
      .map(Number);

    const workDayStart = workStartHours + workStartMinutes / 60;
    const workDayEnd = workEndHours + workEndMinutes / 60;
    const workDayLength = workDayEnd - workDayStart;

    const holidayTimestamps = holidays.map((h) =>
      new Date(h).setHours(0, 0, 0, 0)
    );

    const isWorkingDay = (date) => {
      const day = date.getDay();
      const dateTimestamp = new Date(date).setHours(0, 0, 0, 0);
      return (
        day !== 0 && day !== 6 && !holidayTimestamps.includes(dateTimestamp)
      );
    };

    let adjustedStartDate = new Date(startDate);
    if (!isWorkingDay(adjustedStartDate)) {
      while (!isWorkingDay(adjustedStartDate)) {
        adjustedStartDate.setDate(adjustedStartDate.getDate() + 1);
        adjustedStartDate.setHours(0, 0, 0, 0);
      }
      adjustedStartDate.setHours(workStartHours, workStartMinutes, 0, 0);
    }

    const networkDays = calculationUtils.networkDaysIntl(
      adjustedStartDate,
      endDate,
      holidays
    );
    if (networkDays === 0) return 0;

    const getMedTime = (date) => {
      if (!isWorkingDay(date)) {
        return workDayEnd;
      }
      const hours =
        date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
      return Math.max(workDayStart, Math.min(hours, workDayEnd));
    };

    const startMedTime = getMedTime(adjustedStartDate);
    const endMedTime = getMedTime(endDate);

    let result = 0;
    if (networkDays === 1) {
      if (isWorkingDay(adjustedStartDate) && isWorkingDay(endDate)) {
        result = endMedTime - startMedTime;
      }
    } else {
      const fullDaysPart = (networkDays - 1) * workDayLength;
      result = fullDaysPart + (endMedTime - startMedTime);
    }

    result = result > 0 ? parseFloat(result.toFixed(2)) : 0.0;
    return result;
  },
};

function parseCustomDate(dateString) {
  const [datePart, timePart] = dateString.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hours, minutes, seconds] = timePart.split(':');
  
  return new Date(
    `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  );
}

function convertToISODate(dateStr) {
  if (!dateStr) return '';
  
  const [day, month, year] = dateStr.split('/');
  
  // Validate date components
  if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
    console.error('Invalid date format. Expected DD/MM/YYYY');
    return '';
  }

  return `${year}-${month}-${day}`;
}


const isWorkingDay = (date, holidays) => {
  const day = date.getDay();
  const dateTimestamp = new Date(date).setHours(0, 0, 0, 0);
  const holidayTimestamps = holidays.map(h => new Date(h).setHours(0, 0, 0, 0));
  return day !== 0 && day !== 6 && !holidayTimestamps.includes(dateTimestamp);
};

export const MainPages = () => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [availableData, setAvailableData] = useState([]);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [dataCheckComplete, setDataCheckComplete] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Check for available data on S3 when component loads
  useEffect(() => {
    checkAvailableData();
  }, []);

  // Auto-load latest data file when available
  useEffect(() => {
    if (dataCheckComplete && availableData.length > 0 && !csvData) {
      // Automatically load the latest file (first in the sorted array)
      const latestFile = availableData[0];
      console.log('🔄 Auto-loading latest data file:', latestFile.key);
      handleLoadFromS3(latestFile);
    }
  }, [dataCheckComplete, availableData, csvData]);

  const checkAvailableData = async (forceRefresh = false) => {
    setIsCheckingData(true);
    try {
      if (forceRefresh) {
        console.log('🔄 Force refreshing S3 data to check for overrides...');
      }
      console.log('🔍 Checking for available data on S3...');
      const result = await S3Service.listFiles();
      if (result.success) {
        // Filter for data files (CSV, Excel) - files are already sorted by newest first
        const dataFiles = result.files.filter(file => {
          const extension = file.key.split('.').pop().toLowerCase();
          return ['csv', 'xlsx', 'xls'].includes(extension);
        });
        
        console.log('📊 Found data files on S3 (sorted by newest):', dataFiles);
        setAvailableData(dataFiles);
        
        // If there's a latest file and no data loaded yet, show message
        if (dataFiles.length > 0) {
          console.log('📁 Latest data file available:', dataFiles[0].key);
          console.log('📅 Latest file modified:', dataFiles[0].lastModified);
          console.log('🏷️ Latest file ETag:', dataFiles[0].etag);
        }
        
        if (forceRefresh) {
          console.log('✅ Force refresh completed - file list updated');
        }
      } else {
        console.error('❌ Failed to check S3 data:', result.error);
        setAvailableData([]);
      }
    } catch (error) {
      console.error('💥 Error checking S3 data:', error);
      setAvailableData([]);
    } finally {
      setIsCheckingData(false);
      setDataCheckComplete(true);
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to load data from S3
  const handleLoadFromS3 = async (dataFile) => {
    try {
      console.log('📥 Loading data from S3:', dataFile.key);
      setIsProcessing(true);
      
      const result = await S3Service.downloadFile(dataFile.key);
      if (result.success) {
        // Convert blob to file-like object
        const file = new File([result.blob], dataFile.key.split('-').slice(1).join('-'), {
          type: result.contentType
        });
        
        console.log('✅ Successfully loaded file from S3:', file.name);
        setFile(file);
        
        // Determine file type and process accordingly
        const fileExtension = file.name?.split(".").pop().toLowerCase();
        
        if (fileExtension === "csv") {
          Papa.parse(file, {
            complete: (result) => {
              processData(result.data);
              setIsProcessing(false);
            },
            error: (err) => {
              console.error(err);
              setIsProcessing(false);
            },
            skipEmptyLines: true,
          });
        } else if (["xlsx", "xls"].includes(fileExtension)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            range.e.c = 20; // force to include 21 columns (0-based index)
            
            worksheet['!ref'] = XLSX.utils.encode_range(range);
            const excelData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
            });
            console.log('Excel data loaded from S3:', excelData);
            processData(excelData);
            setIsProcessing(false);
          };
          reader.readAsArrayBuffer(file);
        } else {
          console.error("Unsupported file type");
          setIsProcessing(false);
        }
        
      } else {
        console.error('❌ Failed to load file from S3:', result.error);
        alert('Failed to load file from S3: ' + result.error);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('💥 Error loading from S3:', error);
      alert('Error loading file: ' + error.message);
      setIsProcessing(false);
    }
  };

  const getHolidaysForYears = (years) => {
    const uniqueYears = [...new Set(years)];
    const allHolidays = [];
    
    uniqueYears.forEach(year => {
      if (HOLIDAYS_BY_YEAR[year]) {
        allHolidays.push(...HOLIDAYS_BY_YEAR[year]);
      }
    });
    return allHolidays;
  };

  const processExcelData = (data) => {
    console.log('Raw data:', data);
    const headers = data[0];
    console.log('Original headers:', headers);
    console.log('Request - Subject description index:', headers.indexOf('Request - Subject description'));
    
    const reqCreationDateIndex = headers.indexOf("Req. Creation Date");
    const historicalStatusChangeDateIndex = headers.indexOf(
        "Historical Status - Change Date"
    );

    const rows = data
        .slice(1)
        .filter((row) =>
            row.some((cell) => cell !== undefined && cell !== null && cell !== "")
        )
        .map((row) => {
            const newRow = [...row];
            while (newRow.length < headers.length) newRow.push("");
            if (reqCreationDateIndex !== -1 && newRow[reqCreationDateIndex]) {
                newRow[reqCreationDateIndex] = dateUtils.convertExcelDate(
                    newRow[reqCreationDateIndex]
                );
            }
            if (
                historicalStatusChangeDateIndex !== -1 &&
                newRow[historicalStatusChangeDateIndex]
            ) {
                newRow[historicalStatusChangeDateIndex] = dateUtils.convertExcelDate(
                    newRow[historicalStatusChangeDateIndex]
                );
            }
            return newRow;
        });

    // Identify empty columns (columns where all cells are empty AND header is empty)
    const emptyColumns = [];
    for (let col = 0; col < headers.length; col++) {
        const isHeaderEmpty = headers[col] === "";
        const isColumnEmpty = rows.every(row => 
            row[col] === "" || row[col] === undefined || row[col] === null || 
            (typeof row[col] === 'string' && row[col].trim() === "")
        );
        
        // Only remove columns if BOTH header is empty AND all data is empty
        // Don't remove columns that have a valid header even if data is empty
        if (isHeaderEmpty && isColumnEmpty) {
            emptyColumns.push(col);
            console.log(`Marking column ${col} for removal: header="${headers[col]}", isEmpty=${isColumnEmpty}`);
        }
    }

    console.log('Empty columns to remove:', emptyColumns);
    console.log('Headers before filtering:', headers);

    // Filter out empty columns (in reverse order to avoid index shifting)
    emptyColumns.reverse().forEach(col => {
        console.log(`Removing column ${col}: "${headers[col]}"`);
        headers.splice(col, 1);
        rows.forEach(row => row.splice(col, 1));
    });

    console.log('Headers after filtering:', headers);
    console.log('Request - Subject description still present:', headers.includes('Request - Subject description'));

    const sortedRows = sortDataByRequestId(headers, rows);

    return { headers, rows: sortedRows };
  };

  const sortDataByRequestId = (headers, rows) => {
    const requestIdIndex = headers.indexOf("Request - ID");
    const changeDateIndex = headers.indexOf("Historical Status - Change Date");
    const changeTimeIndex = headers.indexOf("Historical Status - Change Time");

    if (requestIdIndex === -1) return rows; // If no Request ID column, return as-is

    // Group by Request ID
    const groupedData = rows.reduce((acc, row) => {
        const requestId = row[requestIdIndex];
        if (!acc[requestId]) acc[requestId] = [];
        acc[requestId].push(row);
        return acc;
    }, {});

    // Sort each group by date/time if available
    Object.keys(groupedData).forEach(id => {
        groupedData[id].sort((a, b) => {
            // Try to sort by change date + time if available
            if (changeDateIndex !== -1 && changeTimeIndex !== -1) {
                const dateA = a[changeDateIndex];
                const dateB = b[changeDateIndex];
                const timeA = a[changeTimeIndex];
                const timeB = b[changeTimeIndex];

                // Parse dates (DD/MM/YYYY)
                const [dayA, monthA, yearA] = dateA.split('/').map(Number);
                const [dayB, monthB, yearB] = dateB.split('/').map(Number);

                // Create Date objects
                const dateObjA = new Date(yearA, monthA - 1, dayA);
                const dateObjB = new Date(yearB, monthB - 1, dayB);

                // If dates are different, sort by date
                if (dateObjA.getTime() !== dateObjB.getTime()) {
                    return dateObjA - dateObjB;
                }

                // If dates are same, sort by time
                const [hoursA, minutesA, secondsA] = timeA.toString().padStart(6, '0').match(/.{1,2}/g).map(Number);
                const [hoursB, minutesB, secondsB] = timeB.toString().padStart(6, '0').match(/.{1,2}/g).map(Number);

                // Compare times
                if (hoursA !== hoursB) return hoursA - hoursB;
                if (minutesA !== minutesB) return minutesA - minutesB;
                return secondsA - secondsB;
            }
            return 0;
        });
    });

    // Flatten the grouped data back into an array
    return Object.values(groupedData).flat();
  };

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    // For super admins, automatically upload to S3 and process
    if (isSuperAdmin()) {
      await handleAutoUploadAndProcess(selectedFile);
    }
  };

  const handleAutoUploadAndProcess = async (selectedFile) => {
    setIsUploading(true);
    setIsProcessing(true);
    
    try {
      console.log('🚀 Auto-uploading file to S3:', selectedFile.name);
      const uploadResult = await S3Service.uploadFile(selectedFile);
      
      if (uploadResult.success) {
        console.log('✅ Upload successful:', uploadResult.key);
        console.log('🔄 All previous files deleted, now showing only the latest upload');
        
        // Add a small delay to ensure S3 processes the upload and deletions
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Force refresh available data to ensure we see only the new file
        console.log('🔄 Force refreshing data list to confirm single file...');
        await checkAvailableData(true);
        
        // Now process the file
        const fileExtension = selectedFile.name?.split(".").pop().toLowerCase();

        if (fileExtension === "csv") {
          Papa.parse(selectedFile, {
            complete: (result) => {
              processData(result.data);
              setIsProcessing(false);
              setIsUploading(false);
            },
            error: (err) => {
              console.error(err);
              setIsProcessing(false);
              setIsUploading(false);
            },
            skipEmptyLines: true,
          });
        } else if (["xlsx", "xls"].includes(fileExtension)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            range.e.c = 20; // force to include 21 columns (0-based index)
            
            worksheet['!ref'] = XLSX.utils.encode_range(range);
            const excelData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
            });
            console.log('Excel data loaded:', excelData);
            processData(excelData);
            setIsProcessing(false);
            setIsUploading(false);
          };
          reader.readAsArrayBuffer(selectedFile);
        }
      } else {
        console.error('❌ Upload failed:', uploadResult.error);
        alert('Upload failed: ' + uploadResult.error);
        setIsProcessing(false);
        setIsUploading(false);
      }
    } catch (error) {
      console.error('💥 Upload error:', error);
      alert('Upload error: ' + error.message);
      setIsProcessing(false);
      setIsUploading(false);
    }
  };



  const handleSubmit = () => {
    if (!file) return;
    setIsProcessing(true);

    const fileExtension = file.name?.split(".").pop().toLowerCase();

    if (fileExtension === "csv") {
      Papa.parse(file, {
        complete: (result) => {
          processData(result.data);
          setIsProcessing(false);
        },
        error: (err) => {
          console.error(err);
          setIsProcessing(false);
        },
        skipEmptyLines: true,
      });
    } else if (["xlsx", "xls"].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.e.c = 20; // force to include 21 columns (0-based index)
        
        worksheet['!ref'] = XLSX.utils.encode_range(range);
        const excelData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        });
        console.log('Excel data loaded:', excelData);
        processData(excelData);
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error("Unsupported file type");
      setIsProcessing(false);
    }
  };

  const processData = (data) => {
    if (!data || data.length === 0) return;
    const { headers, rows } = processExcelData(data);
    console.log('Final processed headers:', headers);
    // Extract years from the data to determine which holidays to use
    const years = [];
    const reqCreationDateIndex = headers.indexOf("Req. Creation Date");
    const historicalChangeDateIndex = headers.indexOf("Historical Status - Change Date");
    
    rows.forEach(row => {
      // Extract year from creation date
      if (reqCreationDateIndex !== -1 && row[reqCreationDateIndex]) {
        const dateParts = row[reqCreationDateIndex].split('/');
        if (dateParts.length === 3) {
          years.push(dateParts[2]);
        }
      }
      
      // Extract year from change date
      if (historicalChangeDateIndex !== -1 && row[historicalChangeDateIndex]) {
        const dateParts = row[historicalChangeDateIndex].split('/');
        if (dateParts.length === 3) {
          years.push(dateParts[2]);
        }
      }
    });
    
    // Get holidays for all years present in the data
    const relevantHolidays = getHolidaysForYears(years);
    setHolidays(relevantHolidays);

    const headerIndices = {
      reqCreationDate: headers.indexOf("Req. Creation Date"),
      creationTime: headers.indexOf("Creation Time"),
      historicalStatusFrom: headers.indexOf("Historical Status - Status From"),
      requestId: headers.indexOf("Request - ID"),
      historicalStatusTo: headers.indexOf("Historical Status - Status To"),
      reqStatusDescription: headers.indexOf("Req. Status - Description"),
      historicalChangeDate: headers.indexOf("Historical Status - Change Date"),
      historicalChangeTime: headers.indexOf("Historical Status - Change Time"),
      priorityDescription: headers.indexOf("Request - Priority Description"),
      reqClosingDate: headers.indexOf("Req. Closing Date"),
      reqTypeDescription: headers.indexOf("Req. Type - Description EN"),
    };

    YELLOW_FIELDS.forEach((field) => {
      if (!headers.includes(field)) {
        headers.push(field);
        headerIndices[field.toLowerCase()] = headers.length - 1;
      } else {
        headerIndices[field.toLowerCase()] = headers.indexOf(field);
      }
    });

    const firstPassRows = rows.map((row, index) => {
      const newRow = [...row];
      while (newRow.length < headers.length) newRow.push("");

      const statusFrom = (newRow[headerIndices.historicalStatusFrom] || "")
        .toString()
        .trim();
      const statusTo = (newRow[headerIndices.historicalStatusTo] || "")
        .toString()
        .trim();
      const requestId = newRow[headerIndices.requestId];
      const priority = (newRow[headerIndices.priorityDescription] || "P4 - Low")
        .toString()
        .trim();
      const priorityLevel = priority?.split(" ")[0];
      const creationDateVal = newRow[headerIndices.reqCreationDate];
      const creationTime = newRow[headerIndices.creationTime];
      const changeDateVal = newRow[headerIndices.historicalChangeDate];
      const changeTime = newRow[headerIndices.historicalChangeTime];
      const reqStatusDescription = (
        newRow[headerIndices.reqStatusDescription] || ""
      )
      const reqTypeDescription = (
        newRow[headerIndices.reqTypeDescription] || ""
      )
        .toString()
        .trim();

      const creationDateTime = dateUtils.parseDateTime(
        creationDateVal,
        creationTime
      );
      const changeDateTime = dateUtils.parseDateTime(changeDateVal, changeTime, index);

      const creationDate = creationDateTime ? new Date(creationDateTime) : null;
      const changeDate = changeDateTime ? new Date(changeDateTime) : null;

      const allowedStatusesTo = [
        "Work in progress", "Forwarded", "Assigned", 
        "Solved", "Suspended", "Pending for IT check","Awaiting external provider"
      ];
      const excludedStatusesFrom = [
        "Suspended", "Pending for IT check", 
        "Awaiting external provider"
      ];
      
      // Normalize comparison
      const isAllowedTo = allowedStatusesTo.some(
        s => s.toLowerCase() === statusTo.trim().toLowerCase()
      );
      const isExcludedFrom = excludedStatusesFrom.some(
        s => s.toLowerCase() === statusFrom.trim().toLowerCase()
      );
      
      newRow[headerIndices.resolsla] = 
        isAllowedTo && !isExcludedFrom ? "Yes" : " ";

      newRow[headerIndices.respsla] =
        index === 0 || requestId !== rows[index - 1]?.[headerIndices.requestId]
          ? "Yes"
          : " ";

      newRow[headerIndices.reqcrdtconc] =
        newRow[headerIndices.respsla] === "Yes" && creationDateTime
          ? `${dateUtils.formatDate(creationDate)} ${dateUtils.formatTime(
              creationTime
            )}`
          : " ";

      newRow[headerIndices.endtconc] = dateUtils.formatTime(changeTime);

      newRow[headerIndices.hischdtticonc] = changeDateTime
        ? `${dateUtils.formatDate(changeDate)} ${dateUtils.formatTime(
            changeTime
          )}`
        : " ";

      newRow[headerIndices.resolsow] = SLA_TABLE[priorityLevel]?.resolsow || 90;
      newRow[headerIndices.respsow] = SLA_TABLE[priorityLevel]?.respsow || 18;

      return newRow;
    });

    let lastProcessedRow = null;

    const processedRows = firstPassRows.map((row, index) => {
      const newRow = [...row];
      const requestId = newRow[headerIndices.requestId];
      const prevRow = index > 0 ? lastProcessedRow : null;
      const nextRow =
        index < firstPassRows.length - 1 ? firstPassRows[index + 1] : null;
      const prevRequestId = prevRow ? prevRow[headerIndices.requestId] : null;
      const nextRequestId = nextRow ? nextRow[headerIndices.requestId] : null;
      const statusTo = (newRow[headerIndices.historicalStatusTo] || "").toString().trim();

      if (
        newRow[headerIndices.resolsla] === "Yes" &&
        newRow[headerIndices.reqcrdtconc] &&
        newRow[headerIndices.hischdtticonc]
      ) {
        const startDate = parseCustomDate(newRow[headerIndices.reqcrdtconc]);
        const endDate = parseCustomDate(
          newRow[headerIndices.hischdtticonc] ||
            new Date().toLocaleString("en-GB")
        );

        const workingHours = calculationUtils.calculatePreDt(
          startDate,
          endDate,
          WORK_HOURS.start,
          WORK_HOURS.end,
          (holidays.length > 0 ? holidays : relevantHolidays),
          index
        );

        newRow[headerIndices.calcstdt] = workingHours.toFixed(2);
      } else {
        newRow[headerIndices.calcstdt] = "0";
      }

      newRow[headerIndices.refinedstdt] =
      parseFloat(newRow[headerIndices.calcstdt] || 0) < 0 ||
      (newRow[headerIndices.reqTypeDescription] || "").toString().trim() === "Service Request" ||
      holidays.includes(convertToISODate(newRow[headerIndices.historicalChangeDate])) // Column D
        ? "0"
        : newRow[headerIndices.calcstdt];
        
      if (
        newRow[headerIndices.respsla] !== "Yes" &&
        requestId === prevRequestId &&
        prevRow?.[headerIndices.hischdtticonc]
      ) {
        const startDate = parseCustomDate(prevRow[headerIndices.hischdtticonc]);
        const endDate = parseCustomDate(
          newRow[headerIndices.hischdtticonc] ||
            new Date().toLocaleString("en-GB")
        );

        const workingHours = calculationUtils.calculatePreDt(
          startDate,
          endDate,
          WORK_HOURS.start,
          WORK_HOURS.end,
          (holidays.length > 0 ? holidays : relevantHolidays),
          index
        );

        newRow[headerIndices.calcpredt] = workingHours.toFixed(2);
      } else {
        newRow[headerIndices.calcpredt] = "0.00";
      }


      newRow[headerIndices.reqcomp] = 
      (statusTo === "Closed" || statusTo === "Discarded") 
        ? "End" 
        : (nextRow && requestId !== nextRequestId)
          ? "Open" 
          : " ";

newRow[headerIndices.refinedpredt] =
  parseFloat(newRow[headerIndices.calcpredt] || 0) < 0 ||
  (newRow[headerIndices.reqTypeDescription] || "").toString().trim() === "Service Request" ||
  holidays.includes(convertToISODate(newRow[headerIndices.historicalChangeDate]))
    ? "0"
    : newRow[headerIndices.calcpredt];

      newRow[headerIndices.elapsedtime] = (
        newRow[headerIndices.resolsla] === "Yes" &&
        (newRow[headerIndices.respsla] === " " || newRow[headerIndices.respsla] === " ")
          ? parseFloat(newRow[headerIndices.refinedpredt] || 0)
          : parseFloat(newRow[headerIndices.refinedstdt] || 0)
      ).toFixed(2);

      let cumulativeHours = 0;
      if (requestId === prevRequestId) {
        cumulativeHours = parseFloat(prevRow[headerIndices.cumilative] || 0);
      }
      cumulativeHours += parseFloat(newRow[headerIndices.elapsedtime] || 0);
      newRow[headerIndices.cumilative] =
        cumulativeHours > 0 ? cumulativeHours.toFixed(2) : "0.00";

      newRow[headerIndices.resolrem] =
        requestId !== nextRequestId
          ? (
              parseFloat(newRow[headerIndices.resolsow]) -
              parseFloat(newRow[headerIndices.cumilative] || 0)
            ).toFixed(2)
          : "0";

      newRow[headerIndices.resprem] =
        newRow[headerIndices.respsla] === "Yes"
          ? parseFloat(newRow[headerIndices.respsow] || 0) -
            parseFloat(newRow[headerIndices.calcstdt] || 0)
          : (Number(prevRow?.[headerIndices.resprem]) || 0);
      newRow[headerIndices.resprem] = (newRow[headerIndices.resprem]||0)?.toFixed(2);

      if (requestId === nextRequestId) {
        newRow[headerIndices.rollover] = "2000 01";
      } else if (
        !["Closed", "Discarded"].includes(
          newRow[headerIndices.reqStatusDescription]
        )
      ) {
        const today = new Date();
        newRow[headerIndices.rollover] = `${today.getFullYear()} ${String(
          today.getMonth() + 1
        ).padStart(2, "0")}`;
      } else {
        let changeDate;
        try {
          const [datePart, timePart] =
            newRow[headerIndices.hischdtticonc].split(" ");
          const [month,day, year] = datePart.split("/").map(Number);
          changeDate = new Date(year, month - 1, day);
        } catch (error) {
          changeDate = null;
        }

        newRow[headerIndices.rollover] =
          changeDate && !isNaN(changeDate.getTime())
            ? `${changeDate.getFullYear()} ${String(
                changeDate.getMonth() + 1
              ).padStart(2, "0")}`
            : " ";
      }

      const currentRollover = newRow[headerIndices.rollover];
      newRow[headerIndices.dateRollover] = currentRollover;
      newRow[headerIndices.reqcrym] =
        currentRollover && currentRollover.trim() !== ""
          ? newRow[headerIndices.reqCreationDate]
            ? (() => {
                let creationDate;
                try {
                  const [day,month, year] = newRow[
                    headerIndices.reqCreationDate
                  ]
                    .split("/")
                    .map(Number);
                  creationDate = new Date(year, month - 1, day);
                  if (isNaN(creationDate.getTime())) {
                    return " ";
                  }
                  return `${creationDate.getFullYear()} ${String(
                    creationDate.getMonth() + 1
                  ).padStart(2, "0")}`;
                } catch (error) {
                  return " ";
                }
              })()
            : " "
          : "9999 12";

      newRow[headerIndices.dateReqCrYM] = newRow[headerIndices.reqCreationDate];
      newRow[headerIndices.dateRollover] = newRow[headerIndices.rollover];

      // Set DateReqCrYM to be exactly the same as ReqCrYM
      newRow[headerIndices.dateReqCrYM] = newRow[headerIndices.reqcrym];
      lastProcessedRow = newRow;
      return newRow;
    });

    setCsvData([headers, ...processedRows]);
  };

  const handleDownload = () => {
    if (!csvData || csvData.length === 0) return;
  
    const wb = XLSX.utils.book_new();
    const [headers, ...rows] = csvData;
    console.log(headers,'sdfusdjfoidsj')
    // Format date fields in the data
    const formattedRows = rows.map(row => {
        const newRow = [...row];
        // Indexes to format: 0 (Req. Creation Date), 7 (Historical Status - Change Date), 
        // 24 (ReqCrDtConc), 26 (HisChDtTiConc)
        const dateIndexes = [0, 7];
        const changeTimeIndex = headers.indexOf("Historical Status - Change Time");
        if (changeTimeIndex !== -1 && newRow[changeTimeIndex]) {
            const timeStr = newRow[changeTimeIndex].toString().padStart(6, '0');
            newRow[changeTimeIndex] = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
        }
        
        dateIndexes.forEach(index => {
            if (newRow[index]) {
                // If it's a date string in format "dd/mm/yyyy"
                if (typeof newRow[index] === 'string' && newRow[index].match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [dd, mm, yyyy] = newRow[index].split('/');
                    newRow[index] = `${mm}/${dd}/${yyyy}`;
                }
                // If it's an Excel date number (like 45419)
                else if (typeof newRow[index] === 'number') {
                    const date = XLSX.SSF.parse_date_code(newRow[index]);
                    newRow[index] = `${(date.m).toString().padStart(2, '0')}/${(date.d).toString().padStart(2, '0')}/${date.y}`;
                }
                // If it's a datetime string like "04/01/2024 01:45:31"
                else if (typeof newRow[index] === 'string' && newRow[index].match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
                    const [datePart] = newRow[index].split(' ');
                    const [dd, mm, yyyy] = datePart.split('/');
                    newRow[index] = `${mm}/${dd}/${yyyy}`;
                }
            }
        });
        return newRow;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...formattedRows]);
  
    const HIGHLIGHT_FIELDS = [
      "ResolSLA", "RespSLA", "ReqComp", "ReqCrDtConc", "EnDtConc", 
      "HisChDtTiConc", "ElapsedTime", "CalcPreDt", "RefinedPreDt", 
      "CalcStDt", "RefinedStDt", "Cumilative", "ResolSOW", "RespSOW", 
      "ResolRem", "RespRem", "Rollover", "ReqCrYM", "DateRollover", "DateReqCrYM"
    ];
  
    const highlightCols = headers.reduce((acc, header, idx) => {
      if (HIGHLIGHT_FIELDS.includes(header)) acc[idx] = true;
      return acc;
    }, {});
    
    Object.keys(ws).forEach(key => {
      if (key !== '!ref') {
        const col = XLSX.utils.decode_cell(key).c;
        if (highlightCols[col]) {
          ws[key].s = {
            fill: { 
              patternType: "solid", 
              fgColor: { rgb: "ADD8E6" } // Light blue color
            },
            font: { 
              bold: XLSX.utils.decode_cell(key).r === 0 // Bold for header row
            }
          };
        }
      }
    });
  
    XLSX.utils.book_append_sheet(wb, ws, "ProcessedData");
    XLSX.writeFile(wb, "sla_report.xlsx");
};

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center p-6" style={{marginLeft:'280px'}}>
      {/* Full Screen Loader Overlay */}
      {(isCheckingData || isProcessing || isUploading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {isCheckingData ? 'Checking for available data...' : 
                 isUploading ? 'Uploading file...' : 
                 'Processing data...'}
              </h3>
              <p className="text-gray-600 text-sm">
                {isCheckingData ? 'Please wait while we check for the latest data files.' : 
                 isUploading ? 'Your file is being uploaded and will be processed automatically.' : 
                 'Your data is being processed. This may take a few moments.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-xl shadow-lg p-8">

{/*         
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          SLA REPORT
        </h1> */}



        {/* Data Availability Status */}
        {isSuperAdmin()&& dataCheckComplete && !isCheckingData && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">File Status</h2>
              <button
                onClick={() => checkAvailableData(true)}
                disabled={isCheckingData}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isCheckingData ? 'Checking...' : 'Refresh'}
              </button>
            </div>
            
            {availableData.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No Data Available
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      {isSuperAdmin() ? (
                        <p>Please upload data files (CSV, Excel) to get started with SLA reporting.</p>
                      ) : (
                        <p>No data files are currently available. Please contact your administrator to upload the required data files.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
           
                
                {/* Available Data Files List */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Files:</h4>
                  <div className="space-y-2">
                    {availableData.map((dataFile, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {dataFile.key}
                            </p>
                            <p className="text-xs text-gray-500">
                              Size: {formatFileSize(dataFile.size)} • Modified: {new Date(dataFile.lastModified).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleLoadFromS3(dataFile)}
                          disabled={isProcessing}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {isProcessing ? 'Loading...' : 'Submit'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

     { isSuperAdmin()&&  <div className="mb-8">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors duration-200">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="space-y-2">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span className="text-lg">Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
                <p className="text-gray-500">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">CSV, XLSX, XLS up to 10MB</p>
            </div>
            
            {file && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{file.name}</span>
                    <span className="ml-2 text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  {!isUploading && !isProcessing && (
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Status Display */}
                {(isUploading || isProcessing) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center">
                      <svg className="animate-spin h-4 w-4 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-blue-700">
                        {isUploading && isProcessing 
                          ? isSuperAdmin() 
                            ? "Uploading to S3 and processing data..." 
                            : "Processing data..."
                          : isUploading 
                            ? "Uploading to S3..." 
                            : "Processing data..."}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Action Button for Non-Admins */}
                {!isSuperAdmin() && !isProcessing && (
                  <div className="mt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-md text-white font-semibold bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Process Data
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {csvData && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 font-semibold flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Report
              </button>
            </div>
          )}
        </div>}

        {csvData && (
          <div className="space-y-6">
          </div>
        )}
              <div>
      {csvData&&  <Report data={csvData}/>}
      </div>
      </div>
    </div>
  );
};