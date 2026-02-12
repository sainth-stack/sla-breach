/**
 * Background Job Monitoring
 * API: {baseURL}/jobs/Z_I_FA_JOBS → { "d": { "results": [ { JobName, JobCount, RunTimeSeconds, ... } ] } }
 * - Select the job (entity set)
 * - Table with filter by batch (JobCount); columns + Avg Runtime (Daily / 15-day), Standard Deviation, Tolerance
 * - Alert when a run exceeds tolerance (runtime > 15-day avg + tolerance)
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { backgroundJobMonitorBaseURL } from '../../const';
import './index.css';

/** Job/entity set options for selector; API path is /jobs/{value} */
const JOB_OPTIONS = [
  { value: 'Z_I_FA_JOBS', label: 'Z_I_FA_JOBS' },
  { value: 'Z_C_JOBHEADER', label: 'Z_C_JOBHEADER' },
];

/** Parse OData /Date(ms)/ to timestamp */
const parseODataDate = (val) => {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const m = String(val).match(/\/Date\((\d+)\)\//);
  return m ? parseInt(m[1], 10) : null;
};

/** Compute mean of numbers */
const mean = (arr) => {
  if (!arr?.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

/** Compute standard deviation */
const stdDev = (arr) => {
  if (!arr?.length) return 0;
  const m = mean(arr);
  const sqDiffs = arr.map((x) => (x - m) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
};

/** Get run duration in seconds from a row (API uses RunTimeSeconds) */
const getRuntimeSeconds = (row) => {
  const v =
    row.RunTimeSeconds ??
    row.durationInSeconds ??
    row.runtimeSeconds ??
    row.runtime ??
    row.duration;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  return 0;
};

/** Table column config: key, label, format */
const DATA_COLUMNS = [
  { key: 'JobName', label: 'Job Name' },
  { key: 'JobCount', label: 'Batch (Job Count)' },
  { key: 'RunTimeSeconds', label: 'Runtime (s)' },
  { key: 'ScheduledStartDate', label: 'Scheduled Start', format: 'odataDate' },
  { key: 'ScheduledStartTime', label: 'Scheduled Time' },
  { key: 'ExecutionStartDate', label: 'Execution Start', format: 'odataDate' },
  { key: 'ExecutionStartTime', label: 'Execution Time' },
  { key: 'ActualEndDate', label: 'Actual End Date', format: 'odataDate' },
  { key: 'ActualEndTime', label: 'Actual End Time' },
  { key: 'JobStatus', label: 'Status' },
  { key: 'JobClass', label: 'Job Class' },
  { key: 'ScheduledBy', label: 'Scheduled By' },
  { key: 'StartDelayDays', label: 'Start Delay (days)' },
  { key: 'StartHour', label: 'Start Hour' },
  { key: 'IsWeekend', label: 'Is Weekend' },
];

const formatCell = (row, col) => {
  const val = row[col.key];
  if (val == null) return '—';
  if (col.format === 'odataDate') {
    const ms = parseODataDate(val);
    return ms != null ? new Date(ms).toLocaleString() : String(val);
  }
  return String(val);
};

const BackgroundJobMonitoring = () => {
  const [selectedJob, setSelectedJob] = useState(JOB_OPTIONS[0]?.value || 'Z_I_FA_JOBS');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobNameFilter, setJobNameFilter] = useState('');

  const apiUrl = `${backgroundJobMonitorBaseURL}/jobs/${selectedJob}`;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(apiUrl);
      let list = response.data;
      if (Array.isArray(list)) {
        setData(list);
      } else if (list?.d?.results) {
        setData(list.d.results);
      } else if (list?.results) {
        setData(list.results);
      } else if (list && typeof list === 'object' && !list.error) {
        setData(Array.isArray(list.value) ? list.value : [list]);
      } else {
        setData([]);
      }
    } catch (err) {
      const res = err.response;
      const message = res?.data?.error?.message?.value
        ? res.data.error.message.value
        : res
          ? `Request failed: ${res.status} ${res.statusText}`
          : err.message;
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const runtimes = useMemo(
    () => data.map((row) => getRuntimeSeconds(row)).filter((n) => n > 0),
    [data]
  );

  const dailyAvg = useMemo(() => {
    if (!runtimes.length) return 5;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lastDay = data
      .filter((r) => {
        const ms = parseODataDate(r.ExecutionStartDate ?? r.ScheduledStartDate ?? r.ActualEndDate);
        if (ms == null) return true;
        return now - ms <= oneDayMs;
      })
      .map(getRuntimeSeconds)
      .filter((n) => n > 0);
    return lastDay.length ? mean(lastDay) : mean(runtimes);
  }, [data, runtimes]);

  const fifteenDayAvg = useMemo(() => {
    if (!runtimes.length) return 5;
    return mean(runtimes);
  }, [runtimes]);

  const standardDeviation = useMemo(() => {
    if (runtimes.length < 2) return 0.1;
    return stdDev(runtimes);
  }, [runtimes]);

  const toleranceSeconds = useMemo(() => {
    return Math.max(0.1, standardDeviation * 2);
  }, [standardDeviation]);

  const uniqueJobNames = useMemo(() => {
    const set = new Set();
    data.forEach((row) => {
      const name = row.JobName ?? row.jobName ?? '';
      if (name !== '' && name != null) set.add(String(name));
    });
    return Array.from(set).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!jobNameFilter) return data;
    return data.filter((row) => String(row.JobName ?? row.jobName ?? '') === jobNameFilter);
  }, [data, jobNameFilter]);

  const rowsWithStats = useMemo(() => {
    return filteredData.map((row) => {
      const runtime = getRuntimeSeconds(row);
      const exceedsTolerance = runtime > fifteenDayAvg + toleranceSeconds;
      return {
        ...row,
        _runtime: runtime,
        _avgRuntimeDaily: dailyAvg,
        _avgRuntime15Day: fifteenDayAvg,
        _standardDeviation: standardDeviation,
        _tolerance: toleranceSeconds,
        _exceedsTolerance: exceedsTolerance,
      };
    });
  }, [filteredData, dailyAvg, fifteenDayAvg, standardDeviation, toleranceSeconds]);

  const tableColumns = DATA_COLUMNS;

  return (
    <div className="batch-monitor-page">
      <header className="batch-monitor-header">
        <h1 className="batch-monitor-title">Background Job Monitoring</h1>
        <div className="filter-section">
          <label className="filter-label">
            Filter by job name
            <select
              className="filter-select"
              value={jobNameFilter}
              onChange={(e) => setJobNameFilter(e.target.value)}
            >
              <option value="">All job names</option>
              {uniqueJobNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button className="filter-btn" onClick={fetchData}>
            Refresh
          </button>
        </div>
      </header>

      <div className="chart-container table-container">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading job data…</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button className="filter-btn" onClick={fetchData}>
              Retry
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="job-monitor-table">
              <thead>
                <tr>
                  {tableColumns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Avg Runtime (Daily)</th>
                  <th>Avg Runtime (15-day)</th>
                  <th>Standard Deviation</th>
                  <th>Tolerance</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithStats.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + 4} className="empty-cell">
                      No data
                    </td>
                  </tr>
                ) : (
                  rowsWithStats.map((row, idx) => (
                    <tr key={idx} className={row._exceedsTolerance ? 'row-exceeds' : ''}>
                      {tableColumns.map((col) => (
                        <td key={col.key}>{formatCell(row, col)}</td>
                      ))}
                      <td>{row._avgRuntimeDaily.toFixed(2)}s</td>
                      <td>{row._avgRuntime15Day.toFixed(2)}s</td>
                      <td>{row._standardDeviation.toFixed(2)}s</td>
                      <td>{row._tolerance.toFixed(2)}s</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundJobMonitoring;
