import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  message,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Popconfirm,
  Typography,
  Space,
} from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { systemMonitoringHistoryURL } from "../../../const";
import "../../admin/common.css";
import "./index.css";

dayjs.extend(customParseFormat);

const { Text } = Typography;

const DATE_FMT = "DD/MM/YYYY, HH:mm:ss";

const defaultPeriodStartDayjs = () => dayjs();
const defaultPeriodEndDayjs = () =>
  dayjs().hour(23).minute(59).second(59).millisecond(999);

const parseJobDate = (str) => {
  if (!str || typeof str !== "string") return null;
  const parsed = dayjs(str, DATE_FMT, true);
  if (parsed.isValid()) return parsed;
  const loose = dayjs(str);
  return loose.isValid() ? loose : null;
};

const formatJobDate = (v) =>
  dayjs.isDayjs(v) && v.isValid() ? v.format(DATE_FMT) : String(v || "");

/** Default: one record - job name, system S4 Hana, period start/end date and time */
const defaultPeriodStart = () => formatJobDate(defaultPeriodStartDayjs());
const defaultPeriodEnd = () => formatJobDate(defaultPeriodEndDayjs());

const INITIAL_JOBS = [
  {
    id: 1,
    jobName: "/1DH/CDC_HEALTH_CHECK",
    system: "S4 Hana",
    periodStart: defaultPeriodStart(),
    periodEnd: defaultPeriodEnd(),
  },
];

const APP_STATUS_OPTIONS = [
  { value: "RUNNING", label: "Running" },
  { value: "STOPPED", label: "Stopped" },
  { value: "DEGRADED", label: "Degraded" },
  { value: "UNKNOWN", label: "Unknown" },
];

const JobConfiguration = () => {
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [applications, setApplications] = useState([]);
  const [appConfigLoading, setAppConfigLoading] = useState(true);
  const [appConfigError, setAppConfigError] = useState(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobEditingId, setJobEditingId] = useState(null);
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appEditingId, setAppEditingId] = useState(null);
  const [appSubmitting, setAppSubmitting] = useState(false);

  const [jobForm] = Form.useForm();
  const [applicationForm] = Form.useForm();

  const applicationStatusOptions = useMemo(() => {
    const map = new Map(APP_STATUS_OPTIONS.map((o) => [o.value, { ...o }]));
    applications.forEach((a) => {
      const s = (a.status || "").trim();
      if (s && !map.has(s)) map.set(s, { value: s, label: s });
    });
    return Array.from(map.values());
  }, [applications]);

  const syncJobFormWhenModalOpens = useCallback(
    (open) => {
      if (!open) return;
      if (jobEditingId == null) {
        jobForm.setFieldsValue({
          jobName: "",
          system: "",
          periodStart: defaultPeriodStartDayjs(),
          periodEnd: defaultPeriodEndDayjs(),
        });
      } else {
        const job = jobs.find((j) => j.id === jobEditingId);
        if (job) {
          jobForm.setFieldsValue({
            jobName: job.jobName,
            system: job.system,
            periodStart: parseJobDate(job.periodStart) || defaultPeriodStartDayjs(),
            periodEnd: parseJobDate(job.periodEnd) || defaultPeriodEndDayjs(),
          });
        }
      }
    },
    [jobEditingId, jobs, jobForm]
  );

  const syncApplicationFormWhenModalOpens = useCallback(
    (open) => {
      if (!open) return;
      if (appEditingId == null) {
        applicationForm.setFieldsValue({
          appName: "",
          status: undefined,
          details: "",
        });
      } else {
        const app = applications.find((a) => a.id === appEditingId);
        if (app) {
          applicationForm.setFieldsValue({
            appName: app.app_name ?? "",
            status: app.status || undefined,
            details: app.details ?? "",
          });
        }
      }
    },
    [appEditingId, applications, applicationForm]
  );

  const openCreateJob = () => {
    setJobEditingId(null);
    setJobModalOpen(true);
  };

  const openEditJob = (job) => {
    setJobEditingId(job.id);
    setJobModalOpen(true);
  };

  const onJobSubmit = async (values) => {
    setJobSubmitting(true);
    try {
      const start = dayjs(values.periodStart);
      const end = dayjs(values.periodEnd);
      if (start.isValid() && end.isValid() && end.isBefore(start)) {
        message.error("Period end cannot be before period start.");
        return;
      }
      const payload = {
        jobName: values.jobName.trim(),
        system: values.system.trim(),
        periodStart: formatJobDate(values.periodStart),
        periodEnd: formatJobDate(values.periodEnd),
      };
      if (jobEditingId != null) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobEditingId ? { ...j, ...payload } : j
          )
        );
        message.success("Job configuration updated.");
      } else {
        const nextId = Math.max(0, ...jobs.map((j) => j.id)) + 1;
        setJobs((prev) => [...prev, { id: nextId, ...payload }]);
        message.success("Job configuration created.");
      }
      setJobModalOpen(false);
      jobForm.resetFields();
    } finally {
      setJobSubmitting(false);
    }
  };

  const removeJob = (id) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    message.success("Job configuration deleted.");
  };

  const fetchApplicationConfig = useCallback(async () => {
    try {
      setAppConfigLoading(true);
      setAppConfigError(null);
      const res = await fetch(systemMonitoringHistoryURL);
      if (!res.ok) throw new Error("Failed to load application configuration");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setApplications(
        rows.map((row, idx) => ({
          id: idx + 1,
          app_name: row.app_name ?? "",
          status: row.status ?? "",
          details: row.details ?? "",
        }))
      );
    } catch (err) {
      setAppConfigError(err.message || "Failed to load application configuration");
      setApplications([]);
    } finally {
      setAppConfigLoading(false);
    }
  }, []);

  const openCreateApplication = () => {
    setAppEditingId(null);
    setAppModalOpen(true);
  };

  const openEditApplication = (app) => {
    setAppEditingId(app.id);
    setAppModalOpen(true);
  };

  const onApplicationSubmit = async (values) => {
    setAppSubmitting(true);
    try {
      const payload = {
        app_name: values.appName.trim(),
        status: (values.status || "").trim(),
        details: (values.details || "").trim(),
      };
      if (appEditingId != null) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === appEditingId ? { ...a, ...payload } : a
          )
        );
        message.success("Application updated.");
      } else {
        const nextId =
          applications.length === 0
            ? 1
            : Math.max(...applications.map((a) => a.id)) + 1;
        setApplications((prev) => [...prev, { id: nextId, ...payload }]);
        message.success("Application added.");
      }
      setAppModalOpen(false);
      applicationForm.resetFields();
    } finally {
      setAppSubmitting(false);
    }
  };

  const removeApplication = (id) => {
    setApplications((prev) => prev.filter((a) => a.id !== id));
    message.success("Application deleted.");
  };

  useEffect(() => {
    fetchApplicationConfig();
  }, [fetchApplicationConfig]);

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
          <button type="button" className="admin-btn primary" onClick={openCreateJob}>
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
                        onClick={() => openEditJob(job)}
                      >
                        Edit
                      </button>
                      <Popconfirm
                        title={`Delete “${job.jobName}”?`}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => removeJob(job.id)}
                        placement="leftTop"
                      >
                        <button type="button" className="admin-btn link danger">
                          Delete
                        </button>
                      </Popconfirm>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <section className="job-config-app-section" aria-label="Application configuration">
          <div className="header-section">
            <h2 className="page-title">Application configuration</h2>
            <p className="page-subtitle">
              Monitor and manage applications: name, status, and notification details (same data as System Monitoring)
            </p>
          </div>

          <div className="admin-toolbar">
            <button
              type="button"
              className="admin-btn primary"
              onClick={openCreateApplication}
            >
              Add Application
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table job-config-app-table">
              <thead>
                <tr>
                  <th>Application name</th>
                  <th>Status</th>
                  <th>Details</th>
                  <th className="admin-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appConfigLoading ? (
                  <tr>
                    <td colSpan={4} className="admin-empty">
                      Loading application data…
                    </td>
                  </tr>
                ) : appConfigError ? (
                  <tr>
                    <td colSpan={4} className="admin-empty">
                      {appConfigError}
                    </td>
                  </tr>
                ) : applications.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-empty">
                      No applications configured. Add an application or refresh after the feed loads.
                    </td>
                  </tr>
                ) : (
                  applications.map((row) => (
                    <tr key={row.id}>
                      <td className="admin-td-name">{row.app_name || "—"}</td>
                      <td>
                        <span
                          className={
                            (row.status || "").toUpperCase() === "STOPPED"
                              ? "job-config-app-status-stopped"
                              : ""
                          }
                        >
                          {row.status || "—"}
                        </span>
                      </td>
                      <td>{row.details || "—"}</td>
                      <td className="admin-td-actions">
                        <button
                          type="button"
                          className="admin-btn link"
                          onClick={() => openEditApplication(row)}
                        >
                          Edit
                        </button>
                        <Popconfirm
                          title={`Delete “${row.app_name || "this application"}”?`}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => removeApplication(row.id)}
                          placement="leftTop"
                        >
                          <button type="button" className="admin-btn link danger">
                            Delete
                          </button>
                        </Popconfirm>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Modal
          title={
            <div className="job-config-modal-title">
              <span className="job-config-modal-heading">
                {jobEditingId != null ? "Edit job" : "Add job"}
              </span>
              <Text type="secondary" className="job-config-modal-subtitle">
                SAP background job path, target system, and the monitoring time window.
              </Text>
            </div>
          }
          open={jobModalOpen}
          onCancel={() => {
            setJobModalOpen(false);
            jobForm.resetFields();
          }}
          afterOpenChange={syncJobFormWhenModalOpens}
          destroyOnClose
          width={560}
          className="job-config-modal"
          footer={null}
          maskClosable={false}
        >
          <Form
            form={jobForm}
            layout="vertical"
            requiredMark="optional"
            size="middle"
            className="job-config-form"
            onFinish={onJobSubmit}
          >
            <Form.Item
              name="jobName"
              label="Job name"
              extra="Technical job or report name as registered in SAP (e.g. CDC health check)."
              rules={[
                { required: true, message: "Enter a job name" },
                { whitespace: true, message: "Job name cannot be only spaces" },
                { max: 256, message: "Use at most 256 characters" },
              ]}
            >
              <Input allowClear placeholder="/1DH/CDC_HEALTH_CHECK" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="system"
              label="System"
              extra="Landscape or instance this job runs against."
              rules={[
                { required: true, message: "Enter a system" },
                { whitespace: true, message: "System cannot be only spaces" },
                { max: 128, message: "Use at most 128 characters" },
              ]}
            >
              <Input allowClear placeholder="S4 Hana" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="periodStart"
              label="Period start"
              extra="Start of the window used for monitoring and reporting."
              rules={[{ required: true, message: "Select period start" }]}
            >
              <DatePicker
                showTime
                format={DATE_FMT}
                style={{ width: "100%" }}
                placeholder="Select date and time"
              />
            </Form.Item>
            <Form.Item
              name="periodEnd"
              label="Period end"
              extra="End of the monitoring window (must be after start)."
              rules={[{ required: true, message: "Select period end" }]}
            >
              <DatePicker
                showTime
                format={DATE_FMT}
                style={{ width: "100%" }}
                placeholder="Select date and time"
              />
            </Form.Item>
            <div className="job-config-form-footer">
              <Space>
                <Button
                  onClick={() => {
                    setJobModalOpen(false);
                    jobForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={jobSubmitting}>
                  {jobEditingId != null ? "Save changes" : "Create job"}
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>

        <Modal
          title={
            <div className="job-config-modal-title">
              <span className="job-config-modal-heading">
                {appEditingId != null ? "Edit application" : "Add application"}
              </span>
              <Text type="secondary" className="job-config-modal-subtitle">
                Application identity, operational status, and contact or routing details for alerts.
              </Text>
            </div>
          }
          open={appModalOpen}
          onCancel={() => {
            setAppModalOpen(false);
            applicationForm.resetFields();
          }}
          afterOpenChange={syncApplicationFormWhenModalOpens}
          destroyOnClose
          width={560}
          className="job-config-modal"
          footer={null}
          maskClosable={false}
        >
          <Form
            form={applicationForm}
            layout="vertical"
            requiredMark="optional"
            size="middle"
            className="job-config-form"
            onFinish={onApplicationSubmit}
          >
            <Form.Item
              name="appName"
              label="Application name"
              extra="Service or API identifier as reported by monitoring (e.g. expense-tool-api)."
              rules={[
                { required: true, message: "Enter an application name" },
                { whitespace: true, message: "Name cannot be only spaces" },
                { max: 128, message: "Use at most 128 characters" },
              ]}
            >
              <Input allowClear placeholder="expense-tool-api" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="status"
              label="Status"
              extra="Current health or lifecycle state. Values from the feed appear automatically in the list."
              rules={[
                { required: true, message: "Select a status" },
                { max: 64, message: "Use at most 64 characters" },
              ]}
            >
              <Select
                allowClear
                showSearch
                placeholder="Select status"
                options={applicationStatusOptions}
                optionFilterProp="label"
                popupClassName="job-config-select-dropdown"
              />
            </Form.Item>
            <Form.Item
              name="details"
              label="Details"
              extra="Notification target, runbook link, or short description."
              rules={[{ max: 500, message: "Use at most 500 characters" }]}
            >
              <Input.TextArea
                rows={3}
                allowClear
                placeholder="e.g. on-call email or escalation note"
                showCount
                maxLength={500}
              />
            </Form.Item>
            <div className="job-config-form-footer">
              <Space>
                <Button
                  onClick={() => {
                    setAppModalOpen(false);
                    applicationForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={appSubmitting}>
                  {appEditingId != null ? "Save changes" : "Add application"}
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default JobConfiguration;
