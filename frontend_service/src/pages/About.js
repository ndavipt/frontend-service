import React from 'react';
import { Card } from 'react-bootstrap';
import { APP_CONFIG } from '../config';

function About() {
  return (
    <div className="about-page">
      <h1 className="mb-4">About {APP_CONFIG.APP_NAME}</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <h2>Project Overview</h2>
          <p>
            The Instagram AI Leaderboard is a web application that tracks and visualizes follower counts 
            for AI-generated Instagram accounts. It provides insights into the growth and popularity of 
            AI-generated content creators on Instagram.
          </p>
          <p>
            This project combines web scraping technology with a modern microservice architecture to 
            deliver up-to-date statistics on AI-generated profiles.
          </p>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Body>
          <h2>Features</h2>
          <ul>
            <li>Real-time tracking of follower counts for AI-generated Instagram profiles</li>
            <li>Historical growth trends and statistics</li>
            <li>Leaderboard ranking based on follower count</li>
            <li>User submissions for new accounts to track</li>
            <li>API access to collected data</li>
          </ul>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Body>
          <h2>Architecture</h2>
          <p>
            The Instagram AI Leaderboard is built using a microservice architecture with the following components:
          </p>
          <ul>
            <li><strong>Frontend Service:</strong> React-based user interface</li>
            <li><strong>Backend API Gateway:</strong> Flask server that coordinates between services</li>
            <li><strong>Analytics Service:</strong> Provides statistical analysis and reporting</li>
            <li><strong>Scraper Service:</strong> Collects data from Instagram profiles</li>
            <li><strong>Database:</strong> PostgreSQL for storing profile and historical data</li>
          </ul>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Body>
          <h2>Technology Stack</h2>
          <p>This project is built using the following technologies:</p>
          <ul>
            <li><strong>Frontend:</strong> React, Bootstrap, Chart.js</li>
            <li><strong>Backend:</strong> Python, Flask, PostgreSQL</li>
            <li><strong>DevOps:</strong> Docker, GitHub, Render</li>
          </ul>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Body>
          <h2>Contact</h2>
          <p>
            For questions, feedback, or support, please contact us at:&nbsp;
            <a href={`mailto:${APP_CONFIG.CONTACT_EMAIL}`}>{APP_CONFIG.CONTACT_EMAIL}</a>
          </p>
          <p className="mb-0">
            <strong>Version:</strong> {APP_CONFIG.APP_VERSION}
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}

export default About;