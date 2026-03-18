/**
 * Routes allowed for non-admin (limited) users.
 * Admin (isSuperAdmin) can access all routes.
 * Admin-only routes (roles/users) are only in ALL_ADMIN_PATHS.
 */
export const LIMITED_USER_ALLOWED_PATHS = ['/kedb', '/web-suggested-actions'];
export const ALL_ADMIN_PATHS = ['/admin/roles', '/admin/users'];

export const DEFAULT_PATH_FOR_LIMITED_USER = '/kedb';

/**
 * Default route after login or when redirecting due to access denied.
 * Super admin → "/", limited user → first allowed path or /kedb.
 * @param {boolean} isSuperAdmin
 * @param {string[]|null} allowedPaths
 * @returns {string}
 */
export function getDefaultPathForUser(isSuperAdmin, allowedPaths = null) {
  if (isSuperAdmin) return '/';
  return (allowedPaths && allowedPaths[0]) || DEFAULT_PATH_FOR_LIMITED_USER;
}

/**
 * Check if the current user can access the given path.
 * @param {string} path - Route path (e.g. '/kedb')
 * @param {boolean} isSuperAdmin
 * @param {string[]|null} allowedPaths - from API (null = all for super admin)
 * @returns {boolean}
 */
export function canAccessPath(path, isSuperAdmin, allowedPaths = null) {
  if (ALL_ADMIN_PATHS.includes(path)) return isSuperAdmin;
  if (isSuperAdmin) return true;
  if (allowedPaths && Array.isArray(allowedPaths)) return allowedPaths.includes(path);
  return LIMITED_USER_ALLOWED_PATHS.includes(path);
}

/**
 * Get allowed paths for the current user (for sidebar visibility).
 * @param {boolean} isSuperAdmin
 * @param {string[]|null} allowedPaths - from API (null = all)
 * @returns {string[]|null} - List of allowed path strings, or null meaning "all" for admin
 */
export function getAllowedPaths(isSuperAdmin, allowedPaths = null) {
  if (isSuperAdmin) return null; // null = all paths
  if (allowedPaths && Array.isArray(allowedPaths)) return [...LIMITED_USER_ALLOWED_PATHS, ...allowedPaths].filter((p, i, a) => a.indexOf(p) === i);
  return LIMITED_USER_ALLOWED_PATHS;
}
