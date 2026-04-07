export const baseURL = 'https://backend-ams-fastapi.cfapps.us10-001.hana.ondemand.com/api'
// export const baseURL = 'http://localhost:8000/api'
export const logApiURL = 'https://bainocular-log-api.cfapps.us10-001.hana.ondemand.com/log';

export const systemMonitoringHistoryURL = 'https://ans-webhook-happy-civet-oc.cfapps.us10-001.hana.ondemand.com/api/history';
// Batch Monitoring (legacy – commented in favor of Background Job Monitoring)
// export const batchMonitorURL = 'https://tg-monitoring-backend.cfapps.us10-001.hana.ondemand.com/v1/automate/idoc-data/status';

/** Background Job Monitoring – base URL; append /jobs/{entitySet} e.g. /jobs/Z_I_FA_JOBS */
export const backgroundJobMonitorBaseURL = 'https://jobprocessmonitor-balanced-chipmunk-cq.cfapps.us10-001.hana.ondemand.com';