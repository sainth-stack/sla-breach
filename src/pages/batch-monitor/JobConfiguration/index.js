import React, { useState } from "react";
import { message } from "antd";
import "../../admin/common.css";
import "./index.css";

/** Static initial jobs for demo (no API) */
const INITIAL_JOBS = [
  { id: 1, jobName: "Z_I_FA_JOBS", system: "SAP ECC", timePeriod: "Daily" },
  { id: 2, jobName: "Z_C_JOBHEADER", system: "SAP S/4HANA", timePeriod: "Every 6 hours" },
  { id: 3, jobName: "FIN_434", system: "SAP Retail", timePeriod: "Hourly" },
];

const JobConfiguration = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    jobName: "",
    system: "",
    timePeriod: "",
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ jobName: "", system: "", timePeriod: "" });
    setModalOpen(true);
  };

  const openEdit = (job) => {
    setEditingId(job.id);
    setForm({
      jobName: job.jobName,
      system: job.system,
      timePeriod: job.timePeriod,
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
    if (!form.timePeriod.trim()) {
      message.warning("Time Period is required");
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
                timePeriod: form.timePeriod.trim(),
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
          timePeriod: form.timePeriod.trim(),
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
            Configure background jobs: Job Name, System, and Time Period
          </p>
        </div>

        <div className="admin-toolbar">
          <button type="button" className="admin-btn primary" onClick={openCreate}>
            Add Job
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Job Name</th>
                <th>System</th>
                <th>Time Period</th>
                <th className="admin-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-empty">
                    No jobs configured. Add a job to get started.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="admin-td-name">{job.jobName}</td>
                    <td>{job.system}</td>
                    <td>{job.timePeriod}</td>
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
                <label>Job Name</label>
                <input
                  type="text"
                  value={form.jobName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobName: e.target.value }))
                  }
                  placeholder="e.g. Z_I_FA_JOBS"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>System</label>
                <input
                  type="text"
                  value={form.system}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, system: e.target.value }))
                  }
                  placeholder="e.g. SAP ECC"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label>Time Period</label>
                <input
                  type="text"
                  value={form.timePeriod}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, timePeriod: e.target.value }))
                  }
                  placeholder="e.g. Daily, Hourly, Every 6 hours"
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
