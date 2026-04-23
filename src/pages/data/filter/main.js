import React, { useState, useMemo } from 'react';
import TableReport from '../table-report/index';
import '../table-report/TableReport.css'

const ReportViewer = ({ rawData, headerIndices }) => {
  const [filters, setFilters] = useState({
    requestType: [], // Added Request Type filter
    creationDateFrom: null,
    creationDateTo: null,
    priority: [], // Changed to array
    assignedTo: [], // Already array
    status: ['Work in progress'], // Default to "Work in progress"
    breached: [], // Changed to array
    marconaName: [], // Changed to array
    searchText: '',
    timeToBreachOption: 'eq',
    timeToBreachValue: ''
  });

  // Constants for column indexes
  const COLUMNS = {
    RESP_SLA: 22,
    CREATION_DATE: 0,
    TICKET_ID: 3,
    PRIORITY: 4,
    STATUS_FROM: 5,
    STATUS_TO: 6,
    STATUS_CHANGE_DATE: 7,
    ASSIGNED_TO: 13,
    CURRENT_STATUS: 15,
    BREACHED: 20,
    RESP_SLA: 22,
    ELAPSED_TIME: 32,
    resolSW: 33,
    RESP_REM: 35,
    MARCO:9,
    REQ_STATUS: rawData[0].indexOf("Req. Status - Description"),
    RESOLUTION_DATE: rawData[0].indexOf("Req. Resolution Date"),
    REQUEST_TYPE: rawData[0].indexOf("Req. Type - Description EN"),
    TEXT_REQUEST: rawData[0].indexOf("Request - Text Request"),
  };

  const processedData = useMemo(() => {
    if (!rawData || rawData.length < 2) return [];
  
    const headers = rawData[0];
    const rows = rawData.slice(1);
    const ticketGroups = {};
  
    rows.forEach(row => {
      const ticketId = row[COLUMNS.TICKET_ID];
      
      if (!ticketGroups[ticketId]) {
        ticketGroups[ticketId] = [];
      }
      ticketGroups[ticketId].push(row);
    });
  
    return Object.values(ticketGroups).map(ticketRows => {
      const lastRow = ticketRows[ticketRows.length - 1];
      
      return {
        ticketId: lastRow[COLUMNS.TICKET_ID],
        creationDate: lastRow[COLUMNS.CREATION_DATE],
        priority: lastRow[COLUMNS.PRIORITY],
        assignedTo: lastRow[COLUMNS.ASSIGNED_TO],
        marconaName: lastRow[COLUMNS.MARCO],
        textRequest:
          COLUMNS.TEXT_REQUEST >= 0 && lastRow[COLUMNS.TEXT_REQUEST] != null
            ? String(lastRow[COLUMNS.TEXT_REQUEST])
            : '',
        currentStatus: lastRow[COLUMNS.CURRENT_STATUS],
        elapsedTime: lastRow[COLUMNS.ELAPSED_TIME],
        isBreached:lastRow[COLUMNS.RESP_REM] <0 ? true : false,
        status: lastRow[COLUMNS.REQ_STATUS],
        resolutionDate: lastRow[COLUMNS.RESOLUTION_DATE],
        timeToBreach: lastRow[COLUMNS.RESP_REM],
        totalTime:lastRow[COLUMNS.resolSW],
        requestType: lastRow[COLUMNS.REQUEST_TYPE],
        statusChanges: ticketRows.map(row => ({
          from: row[COLUMNS.STATUS_FROM],
          to: row[COLUMNS.STATUS_TO],
          date: row[COLUMNS.STATUS_CHANGE_DATE]
        }))
      };
    });
  }, [rawData]);

  // Filter data based on filters
  const filteredData = useMemo(() => {
    return processedData.filter((ticket) => {
      // Creation date filter
      function parseDDMMYYYY(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      
      if (filters.creationDateFrom) {
        const ticketDate = parseDDMMYYYY(ticket.creationDate);
        if (ticketDate < filters.creationDateFrom) return false;
      }
      if (filters.creationDateTo) {
        const ticketDate = parseDDMMYYYY(ticket.creationDate);
        if (ticketDate > filters.creationDateTo) return false;
      }

      // Add filter logic after the creation date filter and before priority filter
      if (filters.requestType.length > 0 && !filters.requestType.includes(ticket.requestType)) return false;

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(ticket.priority)) return false;

      // Assigned to filter
      if (filters.assignedTo.length > 0 && !filters.assignedTo.includes(ticket.assignedTo)) {
        return false;
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(ticket.currentStatus)) return false;

      // Breached filter
      if (filters.breached.length > 0) {
        const ticketBreached = ticket.isBreached ? 'true' : 'false';
        if (!filters.breached.includes(ticketBreached)) return false;
      }

      // Macro Area filter
      if (filters.marconaName.length > 0 && !filters.marconaName.includes(ticket.marconaName)) return false;

      // Time to Breach filter
      if (filters.timeToBreachValue) {
        const ticketHours = parseFloat(ticket.timeToBreach);
        const filterHours = parseFloat(filters.timeToBreachValue);

        if (!isNaN(ticketHours) && !isNaN(filterHours)) {
          switch (filters.timeToBreachOption) {
            case 'eq':
              if (ticketHours !== filterHours) return false;
              break;
            case 'lte':
              if (ticketHours > filterHours) return false;
              break;
            case 'gte':
              if (ticketHours < filterHours) return false;
              break;
          }
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const ticketText = Object.values(ticket).join(' ').toLowerCase();
        if (!ticketText.includes(searchLower)) return false;
      }

      return true;
    });
  }, [processedData, filters]);

  // Get unique values for filter dropdowns
  const getUniqueValues = (property) => {
    const values = new Set();
    processedData.forEach(ticket => {
      if (ticket[property]) values.add(ticket[property]);
    });
    return Array.from(values).sort();
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      requestType: [], // Added Request Type
      creationDateFrom: null,
      creationDateTo: null,
      priority: [],
      assignedTo: [],
      status: ['Work in progress'], // Reset to default "Work in progress"
      breached: [],
      marconaName: [],
      searchText: '',
      timeToBreachOption: 'eq',
      timeToBreachValue: ''
    });
  };

  return (
    <div className="combined-report-container">
      <TableReport 
        data={filteredData}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
        getUniqueValues={getUniqueValues}
      />
    </div>
  );
};

export default ReportViewer;