import React from 'react';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const SharedFilters = ({ 
  filters, 
  onFilterChange, 
  onResetFilters,
  getUniqueValues 
}) => {
  return (
    <div className="filter-section">


      <div className="filter-grid">
        {/* <div className="filter-group">
          <label className="filter-label">Creation Date From</label>
          <DatePicker
            selected={filters.creationDateFrom}
            onChange={(date) => onFilterChange('creationDateFrom', date)}
            className="filter-input"
            placeholderText="Select start date"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Creation Date To</label>
          <DatePicker
            selected={filters.creationDateTo}
            onChange={(date) => onFilterChange('creationDateTo', date)}
            className="filter-input"
            placeholderText="Select end date"
          />
        </div> */}

        {/* Priority */}
        <div className="filter-group">
          <label className="filter-label">Priority</label>
          <Select
            options={[
              { value: '', label: 'All' },
              ...getUniqueValues('priority').map(priority => ({ value: priority, label: priority }))
            ]}
            value={{ value: filters.priority, label: filters.priority || 'All' }}
            onChange={(option) => onFilterChange('priority', option.value)}
            className="basic-select"
            classNamePrefix="select"
          />
        </div>

        {/* Assigned To */}
        <div className="filter-group">
          <label className="filter-label">Resource</label>
          <Select
            options={[
              { value: '', label: 'All' },
              ...getUniqueValues('assignedTo').map(name => ({ value: name, label: name }))
            ]}
            value={{ value: filters.assignedTo, label: filters.assignedTo || 'All' }}
            onChange={(option) => onFilterChange('assignedTo', option.value)}
            className="basic-select"
            classNamePrefix="select"
          />
        </div>

        {/* Status */}
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <Select
            options={[
              { value: '', label: 'All' },
              ...getUniqueValues('currentStatus').map(status => ({ value: status, label: status }))
            ]}
            value={{ value: filters.status, label: filters.status || 'All' }}
            onChange={(option) => onFilterChange('status', option.value)}
            className="basic-select"
            classNamePrefix="select"
          />
        </div>

        {/* Breached */}
        <div className="filter-group">
          <label className="filter-label">Breached</label>
          <Select
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
            value={{ 
              value: filters.breached, 
              label: filters.breached === 'true' ? 'Yes' : 
                    filters.breached === 'false' ? 'No' : 'All'
            }}
            onChange={(option) => onFilterChange('breached', option.value)}
            className="basic-select"
            classNamePrefix="select"
          />
        </div>

        {/* Time to Breach */}
        <div className="filter-group">
          <label className="filter-label">Time to Breach</label>
          <div className="flex gap-2">
            <Select
              options={[
                { value: 'eq', label: 'Equal to' },
                { value: 'lte', label: 'Less than or equal to' },
                { value: 'gte', label: 'Greater than or equal to' }
              ]}
              value={{
                value: filters.timeToBreachOption,
                label: filters.timeToBreachOption === 'eq' ? 'Equal to' :
                      filters.timeToBreachOption === 'lte' ? 'Less than or equal to' :
                      'Greater than or equal to'
              }}
              onChange={(option) => onFilterChange('timeToBreachOption', option.value)}
              className="basic-select flex-1"
              classNamePrefix="select"
            />
            <input
              type="number"
              placeholder="Hours"
              className="filter-input flex-1"
              value={filters.timeToBreachValue || ''}
              onChange={(e) => onFilterChange('timeToBreachValue', e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="w-full max-w-md">
          <label className="filter-label">Search</label>
          <input
            type="text"
            placeholder="Search across all columns..."
            className="filter-input"
            value={filters.searchText}
            onChange={(e) => onFilterChange('searchText', e.target.value)}
          />
        </div>
        <button
          onClick={onResetFilters}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors ml-4"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default SharedFilters;