import React, { useState, useEffect } from "react";
import ReportViewer from "./filter/main";

const Report = ({ data }) => {
  const [yearMonth, setYearMonth] = useState("");
  const [reportData, setReportData] = useState(null);
  const [headerIndices, setHeaderIndices] = useState(null);
  const [finalData, setFinalData] = useState([]);

  useEffect(() => {
    if (data && data.length > 0) {
      const headers = data[0];
      const indices = {
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
        resolSLA: headers.indexOf("ResolSLA"),
        respSLA: headers.indexOf("RespSLA"),
        reqComp: headers.indexOf("ReqComp"),
        reqCrYM: headers.indexOf("ReqCrYM"),
        rollover: headers.indexOf("Rollover"),
        resolRem: headers.indexOf("ResolRem"),
        respRem: headers.indexOf("RespRem"),
      };
      setHeaderIndices(indices);
    }
  }, [data]);

  useEffect(() => {
    if (data && data.length > 0 && headerIndices) {
      calculateReportData();
    }
  }, [data, yearMonth, headerIndices]);

  const calculateReportData = () => {
    // If yearMonth is not provided, use all data (except header row)
    const data2 = yearMonth 
      ? data.filter(row => 
          row[headerIndices.reqCrYM] <= yearMonth && 
          row[headerIndices.rollover] >= yearMonth
        )
      : data.slice(1); // Skip header row when showing all data

    // Calculate metrics based on whether yearMonth is provided
    const ticketsWorkedOn = yearMonth
      ? data.filter(row => 
          row[headerIndices.reqCrYM] <= yearMonth && 
          row[headerIndices.rollover] >= yearMonth
        ).length
      : data.length - 1; // Subtract 1 for header row

    const ticketsCreated = yearMonth
      ? data.filter(row => 
          row[headerIndices.respSLA] === "Yes" && 
          row[headerIndices.reqCrYM] === yearMonth
        ).length
      : data.filter(row => row[headerIndices.respSLA] === "Yes").length;

    const ticketsCompleted = yearMonth
      ? data.filter(row => 
          row[headerIndices.rollover] === yearMonth && 
          row[headerIndices.reqComp] === "End"
        ).length
      : data.filter(row => row[headerIndices.reqComp] === "End").length;

    const resolutionSLA = yearMonth
      ? data.filter(row => 
          row[headerIndices.rollover] === yearMonth &&  
          row[headerIndices.resolRem] >= 0 && 
          row[headerIndices.reqComp] === "End"
        ).length
      : data.filter(row => 
          row[headerIndices.resolRem] >= 0 && 
          row[headerIndices.reqComp] === "End"
        ).length;

    const resolutionSLAPercentage = ticketsCompleted > 0 
      ? parseFloat(((resolutionSLA / ticketsCompleted) * 100).toFixed(1)) 
      : 0;

    const responseSLA = yearMonth
      ? data.filter(row => 
          row[headerIndices.respSLA] === "Yes" &&
          row[headerIndices.reqCrYM] === yearMonth &&
          row[headerIndices.respRem] >= 0
        ).length
      : data.filter(row => 
          row[headerIndices.respSLA] === "Yes" &&
          row[headerIndices.respRem] >= 0
        ).length;

    const responseSLAPercentage = ticketsCreated > 0 
      ? parseFloat(((responseSLA / ticketsCreated) * 100).toFixed(1)) 
      : 0;

    // Prepare final data (always include header row)
    setFinalData(yearMonth ? [data[0], ...data2] : data);

    setReportData({
      ticketsWorkedOn,
      ticketsCreated,
      ticketsCompleted,
      resolutionSLA,
      resolutionSLAPercentage,
      responseSLA,
      responseSLAPercentage
    });
  };

  const handleYearMonthChange = (e) => {
    setYearMonth(e.target.value);
  };

  if (!headerIndices) return <div>Loading report...</div>;

  return (
    <div className="mx-auto p-6 bg-white rounded-lg shadow-md" style={{marginTop:'30px'}}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {yearMonth ? `Report for the month of:` : "Complete Report"}
        </h1>
        <input
          type="text"
          value={yearMonth}
          onChange={handleYearMonthChange}
          placeholder="YYYY MM (leave empty for all data)"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Ticket Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {yearMonth ? "Total # of tickets worked on" : "Total tickets"}
              </span>
              <span className="font-bold text-gray-900">{reportData?.ticketsWorkedOn || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {yearMonth ? "Tickets created in the month" : "Tickets with response SLA"}
              </span>
              <span className="font-bold text-gray-900">{reportData?.ticketsCreated || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {yearMonth ? "Total # of tickets completed" : "Completed tickets"}
              </span>
              <span className="font-bold text-gray-900">{reportData?.ticketsCompleted || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800 mb-4">SLA Performance</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {yearMonth ? "Resolution SLA for the month" : "Overall Resolution SLA"}
              </span>
              <div className="text-right">
                <span className="font-bold text-gray-900 mr-2">{reportData?.resolutionSLA || 0}</span>
                <span className="text-green-600">{reportData?.resolutionSLAPercentage || 0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">
                {yearMonth ? "Response SLA for the month" : "Overall Response SLA"}
              </span>
              <div className="text-right">
                <span className="font-bold text-gray-900 mr-2">{reportData?.responseSLA || 0}</span>
                <span className="text-green-600">{reportData?.responseSLAPercentage || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      {finalData.length > 0 && (
        <ReportViewer 
          rawData={finalData} 
          yearMonth={yearMonth} 
          headerIndices={headerIndices}
        />
      )}
    </div>
  );
};

export default Report;