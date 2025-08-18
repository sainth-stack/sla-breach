import axios from 'axios';

// export const baseURL = 'http://127.0.0.1:8000';

export const baseURL = 'http://34.123.109.79:3001';
// Central axios instance configured with baseURL
const api = axios.create({ baseURL });

export default api;