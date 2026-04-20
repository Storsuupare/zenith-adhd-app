import axios from 'axios';


const API = axios.create({ baseURL: 'http://localhost:5000'});


export const getAdminUser = (clerkId) => API.get(`/user/${clerkId}`);;
export const createContract = (data) => API.post('/contracts', data);