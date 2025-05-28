import React, { useState, useEffect } from "react";
import TableReport from "./table-report";
import PiechartReport from "./piechart/piechart-report";
import ReportViewer from "./filter/main";

const Report = ({ data }) => {
  console.log(data);
  const [yearMonth, setYearMonth] = useState("");
  const [reportData, setReportData] = useState(null);
  const [headerIndices, setHeaderIndices] = useState(null);
const [finalData,setFinalData]=useState([])
  useEffect(() => {
    if (data && data.length > 0) {
      // Extract header indices from the first row
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
    console.log(yearMonth.length)
    if (data && data.length > 0 && headerIndices && yearMonth?.length>6) {
      calculateReportData();
    }
  }, [data, yearMonth, headerIndices]);

  const calculateReportData = () => {
    const data2=[]
    data.filter(row => {
      if(row[headerIndices.reqCrYM] <= yearMonth && 
        row[headerIndices.rollover] >= yearMonth){
        data2.push(row)
      }
    })
    const ticketsWorkedOn = data.filter(row => 
      row[headerIndices.reqCrYM] <= yearMonth && 
      row[headerIndices.rollover] >= yearMonth
    ).length;

    // Tickets created in the month (ResolSLA is "Yes")
    const ticketsCreated = data.filter(row => 
      row[headerIndices.respSLA] === "Yes" && 
      row[headerIndices.reqCrYM] === yearMonth
    ).length;

    // Total # of tickets completed (Rollover matches yearMonth)
    const ticketsCompleted = data.filter(row => 
      row[headerIndices.rollover] === yearMonth
    ).length;
      
    // Resolution SLA
    const resolutionSLA = data.filter(row => 
      row[headerIndices.rollover] === yearMonth &&  
      row[headerIndices.resolRem] >= 0            
    ).length;
      
    const resolutionSLAPercentage = ticketsCompleted > 0 
      ? parseFloat(((resolutionSLA / ticketsCompleted) * 100).toFixed(1)) 
      : 0;

    const responseSLA = data.filter(row => 
      row[headerIndices.respSLA] === "Yes" &&      // RespSLA - "Yes" for SLA Met
      row[headerIndices.reqCrYM] === yearMonth &&  // ReqCrYM - Fiscal Month
      row[headerIndices.respRem] >= 0              // RespRem - SLA Time >= 0
    ).length;
          
    const responseSLAPercentage = ticketsCreated > 0 
      ? parseFloat(((responseSLA / ticketsCreated) * 100).toFixed(1)) 
      : 0;
      setFinalData([data[0],...data2])
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
          Report for the month of:
        </h1>
        <input
          type="text"
          value={yearMonth}
          onChange={handleYearMonthChange}
          placeholder="YYYY MM"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Ticket Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total # of tickets worked on</span>
              <span className="font-bold text-gray-900">{reportData?.ticketsWorkedOn ||0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Tickets created in the month</span>
              <span className="font-bold text-gray-900">{reportData?.ticketsCreated ||0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total # of tickets completed</span>
              <span className="font-bold text-gray-900">{reportData?.ticketsCompleted ||0}</span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800 mb-4">SLA Performance</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Resolution SLA for the month</span>
              <div className="text-right">
                <span className="font-bold text-gray-900 mr-2">{reportData?.resolutionSLA ||0}</span>
                <span className="text-green-600">{reportData?.resolutionSLAPercentage ||0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Response SLA for the month</span>
              <div className="text-right">
                <span className="font-bold text-gray-900 mr-2">{reportData?.responseSLA ||0}</span>
                <span className="text-green-600">{reportData?.responseSLAPercentage ||0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* <TableReport data={data}/>
<PiechartReport data={data}/> */}
{(yearMonth &&yearMonth?.length>6 && finalData.length>0) && <ReportViewer rawData={finalData} yearMonth={yearMonth} headerIndices={headerIndices}/>}
    </div>
  );
};

export default Report;