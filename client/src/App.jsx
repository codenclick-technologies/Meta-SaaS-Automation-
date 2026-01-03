import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Login from './pages/Login';
import LeadDetail from './pages/LeadDetail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import IntegrationsPage from './pages/IntegrationsPage';
import WorkflowBuilderPage from './pages/WorkflowBuilderPage';
import WorkflowExecutionLogsPage from './pages/WorkflowExecutionLogsPage';
import CompliancePage from './pages/CompliancePage';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import ROIOptimizerDashboard from './pages/ROIOptimizerDashboard';
import SecurityAccessControl from './pages/SecurityAccessControl';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import NotificationToast from './components/NotificationToast';

import { useEffect } from 'react';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    
    // session management: Auto-logout after 30 mins of inactivity
    useEffect(() => {
        if (!token) return;

        let idleTimer;
        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.log('User idle for 30 mins. Logging out.');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }, 30 * 60 * 1000); // 30 Minutes
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        resetTimer();

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            clearTimeout(idleTimer);
        };
    }, [token]);

    return token ? children : <Navigate to="/login" />;
};

export default function App() {
    return (
        <BrowserRouter>
            <NotificationToast />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/onboarding" element={
                    <PrivateRoute>
                        <Onboarding />
                    </PrivateRoute>
                } />
                <Route path="/" element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                } />
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <Dashboard />
                    </PrivateRoute>
                } />
                <Route path="/leads" element={
                    <PrivateRoute>
                        <Leads />
                    </PrivateRoute>
                } />
                <Route path="/leads/:id" element={
                    <PrivateRoute>
                        <LeadDetail />
                    </PrivateRoute>
                } />
                <Route path="/integrations" element={
                    <PrivateRoute>
                        <IntegrationsPage />
                    </PrivateRoute>
                } />
                <Route path="/workflows" element={
                    <PrivateRoute>
                        <WorkflowBuilderPage />
                    </PrivateRoute>
                } />
                <Route path="/workflows/history" element={
                    <PrivateRoute>
                        <WorkflowExecutionLogsPage />
                    </PrivateRoute>
                } />
                <Route path="/users" element={
                    <PrivateRoute>
                        <UsersPage />
                    </PrivateRoute>
                } />
                <Route path="/settings" element={
                    <PrivateRoute>
                        <SettingsPage />
                    </PrivateRoute>
                } />
                <Route path="/compliance" element={
                    <PrivateRoute>
                        <CompliancePage />
                    </PrivateRoute>
                } />
                <Route path="/intelligence" element={
                    <PrivateRoute>
                        <IntelligenceDashboard />
                    </PrivateRoute>
                } />
                <Route path="/roi-optimizer" element={
                    <PrivateRoute>
                        <ROIOptimizerDashboard />
                    </PrivateRoute>
                } />
                <Route path="/security" element={
                    <PrivateRoute>
                        <SecurityAccessControl />
                    </PrivateRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}
