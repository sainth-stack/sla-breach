import { logApiURL } from '../const';

const PATH_LOG_CONFIG = {
  kedb: {
    moduleName: 'Knowledge Search',
    programName: 'KEDB.js'
  }
};

const toTitleCase = (value = '') =>
  value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getLogMetaFromPath = (pathname = '') => {
  const segment = (pathname || '/')
    .split('/')
    .filter(Boolean)
    .pop() || 'home';

  const configured = PATH_LOG_CONFIG[segment.toLowerCase()];
  if (configured) {
    return configured;
  }

  const pageName = toTitleCase(segment);
  return {
    moduleName: pageName || 'Unknown Module',
    programName: `${segment}.js`
  };
};

export const sendAppLog = async ({
  pathname = window.location.pathname,
  user = 'Admin',
  logType = 'I',
  content = ''
}) => {
  const { moduleName, programName } = getLogMetaFromPath(pathname);
  const payload = {
    module_name: moduleName,
    program_name: programName,
    user,
    log_type: logType,
    content
  };

  try {
    const response = await fetch(logApiURL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      keepalive: true
    });

    if (!response.ok) {
      throw new Error(`Log API returned ${response.status}`);
    }

    return true;
  } catch (error) {
    // Fallback for browsers/CORS edge cases; do not block primary app flow.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(
        logApiURL,
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
      if (sent) {
        return true;
      }
    }

    console.error('Failed to send app log:', error, payload);
    return false;
  }
};
