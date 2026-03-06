/**
 * Routes allowed for non-admin (limited) users.
 * Admin (isSuperAdmin) can access all routes.
 */
export const LIMITED_USER_ALLOWED_PATHS = ['/kedb', '/web-suggested-actions'];

export const DEFAULT_PATH_FOR_LIMITED_USER = '/kedb';

/**
 * Check if the current user can access the given path.
 * @param {string} path - Route path (e.g. '/kedb')
 * @param {boolean} isSuperAdmin
 * @returns {boolean}
 */
export function canAccessPath(path, isSuperAdmin) {
  if (isSuperAdmin) return true;
  return LIMITED_USER_ALLOWED_PATHS.includes(path);
}

/**
 * Get allowed paths for the current user.
 * @param {boolean} isSuperAdmin
 * @returns {string[]} - List of allowed path strings, or null meaning "all" for admin
 */
export function getAllowedPaths(isSuperAdmin) {
  if (isSuperAdmin) return null; // null = all paths
  return LIMITED_USER_ALLOWED_PATHS;
}
