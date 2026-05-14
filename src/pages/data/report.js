import React from "react";
import ReportViewer from "./filter/main";

const Report = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  return (
    <div className="mx-auto p-0 bg-white rounded-lg">
      <div className="mb-8">
        {/* <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Complete Report
        </h1> */}
      </div>

      <ReportViewer 
        rawData={data}
        headerIndices={null}
      />
    </div>
  );
};

export default Report;