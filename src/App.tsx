import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MissionWorkspace from './components/MissionWorkspace';
import ProtectedRoute from './components/ProtectedRoute';
import { ChatProvider } from './components/ChatContext';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <AuthProvider>
        <ChatProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/mission/:id" element={
                  <ProtectedRoute>
                    <MissionWorkspace />
                  </ProtectedRoute>
                } />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </Router>
        </ChatProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;