import React, { useState } from "react";
import { message } from "antd";
import { MdWork, MdComputer, MdSchedule } from "react-icons/md";
import "../../admin/common.css";
import "./index.css";

/** Default: one record - job name, system S4 Hana, period start/end date and time */
const defaultPeriodStart = () => {
  const d = new Date();
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", ",");
};
const defaultPeriodEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).replace(",", ",");
};

const INITIAL_JOBS = [
  { id: 1, jobName: "/1DH/CDC_HEALTH_CHECK", system: "S4 Hana", periodStart: defaultPeriodStart(), periodEnd: defaultPeriodEnd() },
];

const JobConfiguration = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    jobName: "",
    system: "",
    periodStart: "",
    periodEnd: "",
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      jobName: "",
      system: "",
      periodStart: defaultPeriodStart(),
      periodEnd: defaultPeriodEnd(),
    });
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditingId(job.id);
    setForm({
      jobName: job.jobName,
      system: job.system,
      periodStart: job.periodStart || defaultPeriodStart(),
      periodEnd: job.periodEnd || defaultPeriodEnd(),
    });
    setModalOpen(true);
  };

  const saveJob = () => {
    if (!form.jobName.trim()) {
      message.warning("Job Name is required");
      return;
    }
    if (!form.system.trim()) {
      message.warning("System is required");
      return;
    }
    if (!form.periodStart.trim()) {
      message.warning("Period Start is required");
      return;
    }
    if (!form.periodEnd.trim()) {
      message.warning("Period End is required");
      return;
    }
    if (editingId) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editingId
            ? {
                ...j,
                jobName: form.jobName.trim(),
                system: form.system.trim(),
                periodStart: form.periodStart.trim(),
                periodEnd: form.periodEnd.trim(),
              }
            : j
        )
      );
      message.success("Job updated");
    } else {
      const nextId = Math.max(0, ...jobs.map((j) => j.id)) + 1;
      setJobs((prev) => [
        ...prev,
        {
          id: nextId,
          jobName: form.jobName.trim(),
          system: form.system.trim(),
          periodStart: form.periodStart.trim(),
          periodEnd: form.periodEnd.trim(),
        },
      ]);
      message.success("Job created");
    }
    setModalOpen(false);
  };

  const deleteJob = (id) => {
    if (!window.confirm("Delete this job configuration?")) return;
    setJobs((prev) => prev.filter((j) => j.id !== id));
    message.success("Job deleted");
  };

  return (
    <div className="admin-page-container job-config-page">
      <div className="admin-page-content">
        <div className="header-section">
          <h1 className="page-title">Job Configuration</h1>
          <p className="page-subtitle">
            Configure background jobs: Job Name, System, and Time Period (Start & End)
          </p>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="admin-btn primary" onClick={openCreate}>
            Add Job
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table job-config-table">
            <thead>
              <tr>
                <th>Job Name</th>
                <th>System</th>
                <th colSpan={2} className="job-config-time-period-header">Time Period</th>
                <th className="admin-th-actions">Actions</th>
              </tr>
              <tr className="job-config-period-subhead">
                <th></th>
                <th></th>
                <th className="job-config-period-subhead-cell">Period Start</th>
                <th className="job-config-period-subhead-cell">Period End</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-empty">
                    No jobs configured. Add a job to get started.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="admin-td-name">{job.jobName}</td>
                    <td>{job.system}</td>
                    <td className="job-config-period-cell">{job.periodStart}</td>
                    <td className="job-config-period-cell">{job.periodEnd}</td>
                    <td className="admin-td-actions">
                      <button
                        type="button"
                        className="admin-btn link"
                        onClick={() => openEdit(job)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn link danger"
                        onClick={() => deleteJob(job.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="admin-modal-title">
                {editingId ? "Edit Job" : "Add Job"}
              </h2>
              <div className="admin-form-group">
                <label>
                  <MdWork size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Job Name
                </label>
                <input
                  type="text"
                  value={form.jobName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobName: e.target.value }))
                  }
                  placeholder="e.g. /1DH/CDC_HEALTH_CHECK"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <MdComputer size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  System
                </label>
                <input
                  type="text"
                  value={form.system}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, system: e.target.value }))
                  }
                  placeholder="e.g. S4 Hana"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <MdSchedule size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Period Start (Date & Time)
                </label>
                <input
                  type="text"
                  value={form.periodStart}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periodStart: e.target.value }))
                  }
                  placeholder="e.g. 18/03/2025, 00:00:00"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <MdSchedule size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Period End (Date & Time)
                </label>
                <input
                  type="text"
                  value={form.periodEnd}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                  placeholder="e.g. 18/03/2025, 23:59:59"
                  className="admin-input"
                />
              </div>
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn primary"
                  onClick={saveJob}
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobConfiguration;
