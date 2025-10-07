import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MissionWorkspace from './components/MissionWorkspace';
import './App.css';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mission/:id" element={<MissionWorkspace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </MantineProvider>
  );
}

export default App;