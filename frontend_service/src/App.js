import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Leaderboard from './pages/Leaderboard';
import Trends from './pages/Trends';
import SubmitAccount from './pages/SubmitAccount';
import About from './pages/About';
import APITest from './pages/APITest';
import './custom-styles.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Leaderboard />} />
        <Route path="trends" element={<Trends />} />
        <Route path="submit" element={<SubmitAccount />} />
        <Route path="about" element={<About />} />
        <Route path="api-test" element={<APITest />} />
      </Route>
    </Routes>
  );
}

export default App;