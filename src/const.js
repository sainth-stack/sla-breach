import axios from 'axios';

export const baseURL = 'http://127.0.0.1:8000';

// Central axios instance configured with baseURL
const api = axios.create({ baseURL });

export default api;