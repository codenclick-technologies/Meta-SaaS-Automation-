import axios from 'axios';

// Create Axios Instance
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000', // Or use proxy /api
});

// Request Interceptor to add Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Auth Services
export const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

export const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgotpassword', { email });
    return data;
};

export const resetPassword = async (token, password) => {
    const { data } = await api.post(`/auth/resetpassword/${token}`, { password });
    return data;
};

// Lead Services
export const getLeads = async (filters = {}) => {
    // Convert basic filters to query string
    const params = new URLSearchParams(filters).toString();
    const { data } = await api.get(`/leads?${params}`);
    return data;
};

export const getLeadById = async (id) => {
    const { data } = await api.get(`/leads/${id}`);
    return data;
};

export const getLeadLogs = async (id) => {
    const { data } = await api.get(`/leads/${id}/logs`);
    return data;
}

export const retryEmail = async (id) => {
    const { data } = await api.post(`/leads/${id}/retry-email`);
    return data;
};

export const retryWhatsapp = async (id) => {
    const { data } = await api.post(`/leads/${id}/retry-whatsapp`);
    return data;
};

export const updateLeadStatus = async (id, status) => {
    const { data } = await api.put(`/leads/${id}/status`, { status });
    return data;
};

// Single Assign
export const assignLead = async (id, assignedTo) => {
    const { data } = await api.put(`/leads/${id}/assign`, { assignedTo });
    return data;
};

// Bulk Assign
export const assignLeads = async (ids, assignedTo) => {
    const { data } = await api.post('/leads/assign-batch', { ids, assignedTo });
    return data;
};

export const restoreLead = async (id) => {
    const { data } = await api.put(`/leads/${id}/restore`);
    return data;
};

export const markSpam = async (id) => {
    const { data } = await api.put(`/leads/${id}/spam`);
    return data;
};

export const deleteLead = async (id) => {
    const { data } = await api.delete(`/leads/${id}`);
    return data;
};

export const deleteLeads = async (ids) => {
    const { data } = await api.post('/leads/delete-batch', { ids });
    return data;
};

export const deleteLeadsByDate = async (dateFrom, dateTo) => {
    const { data } = await api.delete('/leads/by-date', {
        params: { dateFrom, dateTo }
    });
    return data;
};

export const getTeam = async (search = '') => {
    const { data } = await api.get('/users/team', { params: { search } });
    return data;
};

export const createUser = async (userData) => {
    const { data } = await api.post('/users', userData);
    return data;
};

export const deleteUser = async (id) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
};

export const updateUser = async (id, userData) => {
    const { data } = await api.put(`/users/${id}`, userData);
    return data;
};

export const getSettings = async () => {
    const { data } = await api.get('/settings');
    return data;
};

export const updateSettings = async (settingsData) => {
    const { data } = await api.put('/settings', settingsData);
    return data;
};

export const verifyEmailSettings = async (credentials) => {
    const { data } = await api.post('/settings/verify-email', credentials);
    return data;
};

export const verifyWhatsappSettings = async (credentials) => {
    const { data } = await api.post('/settings/verify-whatsapp', credentials);
    return data;
};

export const verifyOpenAISettings = async (credentials) => {
    const { data } = await api.post('/settings/verify-openai', credentials);
    return data;
};

export default api;
