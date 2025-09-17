import React, { useState, useRef } from 'react';
import './index.css';
import { FaUpload, FaFileAlt, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { IoCloudUploadOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';
import { baseURL } from '../../const';
import { readFileAsData, processFileData } from '../../utils/dataProcessor';

const DataSource = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadStatus('');
    await uploadFile(selectedFile);
  };

  const uploadFile = async (selectedFile) => {
    setIsLoading(true);
    setUploadStatus('');

    try {
      // Step 1: Read the file data
      const rawData = await readFileAsData(selectedFile);
      console.log('File read successfully:', rawData?.length, 'rows');

      // Step 2: Process the data using our utility
      const processedData = processFileData(rawData);
      if (!processedData || processedData.length === 0) {
        throw new Error('Failed to process file data. Please check the file format.');
      }

      console.log('Data processed successfully:', processedData.length, 'rows');

      // Step 3: Convert processed data to the format expected by the API
      const [headers, ...rows] = processedData;
      const records = rows.map(row => {
        const record = {};
        headers.forEach((header, index) => {
          record[header] = row[index] || '';
        });
        return record;
      });

      // Step 4: Send processed data to API
      const response = await fetch(baseURL + '/upload_processed_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          records: records,
          headers: headers
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload successful:', data);

      // Store file information
      const fileInfo = {
        name: selectedFile.name,
        uploadDate: new Date().toISOString(),
        size: selectedFile.size,
        originalName: selectedFile.name,
        serverFilename: 'data1.csv',
        processed: true,
        recordCount: records.length
      };
      localStorage.setItem('uploadedFile', JSON.stringify(fileInfo));
      

      setUploadStatus('success');
      
      // Navigate to self-monitoring page
      setTimeout(() => {
        navigate('/self-monitoring');
      }, 1500);
      
    } catch (error) {
      console.error('Error processing/uploading file:', error);
      setUploadStatus('error');
      
      // Show more detailed error message
      if (error.message.includes('Unsupported file format')) {
        console.error('Please upload a valid CSV or Excel file.');
      } else if (error.message.includes('Failed to process')) {
        console.error('The file format appears to be invalid. Please check your data structure.');
      } else {
        console.error('Upload failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv') || 
        droppedFile.type.includes('spreadsheet') || droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setUploadStatus('');
      uploadFile(droppedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="data-source-container">
      <div className="data-source-content">
        <div className="header-section">
          <h1 className="page-title">Data Source</h1>
          <p className="page-subtitle">Upload your data file to begin SLA monitoring and analysis</p>
        </div>

        <div className="upload-section">
          <div 
            className={`upload-zone ${isLoading ? 'loading' : ''} ${uploadStatus === 'success' ? 'success' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />
            
            <div className="upload-icon">
              {isLoading ? (
                <FaSpinner className="spinner" />
              ) : uploadStatus === 'success' ? (
                <FaCheckCircle className="success-icon" />
              ) : (
                <IoCloudUploadOutline />
              )}
            </div>

            <div className="upload-text">
              {isLoading ? (
                <div>
                  <h3>Processing...</h3>
                  <p>Reading and processing your file data</p>
                </div>
              ) : uploadStatus === 'success' ? (
                <div>
                  <h3>Processing Complete!</h3>
                  <p>Your data has been processed and uploaded successfully</p>
                </div>
              ) : uploadStatus === 'error' ? (
                <div>
                  <h3>Processing Failed</h3>
                  <p>Please check your file format and try again</p>
                </div>
              ) : (
                <div>
                  <h3>Drop your data file here</h3>
                  <p>or <span className="browse-text">click to browse</span></p>
                  <p className="file-types">Supported formats: CSV, Excel (.xlsx, .xls)</p>
                </div>
              )}
            </div>
          </div>

          {file && !isLoading && (
            <div className="file-info">
              <div className="file-details">
                <FaFileAlt className="file-icon" />
                <div className="file-metadata">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DataSource;
