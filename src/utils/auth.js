// Authentication utilities
export const getUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const user = getUser();
  return user && user.isAuthenticated;
};

export const isSuperAdmin = () => {
  const user = getUser();
  return user && user.isSuperAdmin === true;
};

export const getUserName = () => {
  const user = getUser();
  console.log(user,'dfskjkldsfdsf')
  return user ? user.name : '';
};

export const getUserEmail = () => {
  const user = getUser();
  return user ? user.email : '';
}; 