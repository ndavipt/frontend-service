import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Spinner } from 'react-bootstrap';
import { checkServiceStatus } from '../services/api';
import { API_CONFIG } from '../config';

function APITest() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await checkServiceStatus();
      setStatus(result);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to check API status. Is the backend running?');
      setLoading(false);
      console.error('Error checking API status:', err);
    }
  };

  // Helper function to render the status indicator
  const renderStatusIndicator = (statusText) => {
    let colorClass = 'status-warning';
    
    if (statusText === 'online') {
      colorClass = 'status-online';
    } else if (statusText === 'offline' || statusText?.startsWith('error')) {
      colorClass = 'status-offline';
    }
    
    return (
      <span>
        <span className={`status-indicator ${colorClass}`}></span>
        {statusText}
      </span>
    );
  };

  return (
    <div>
      <h1 className="mb-4">API Status Test</h1>
      
      <div className="mb-3">
        <Button 
          variant="primary" 
          onClick={checkStatus} 
          disabled={loading}
        >
          {loading ? <><Spinner size="sm" animation="border" /> Checking...</> : 'Check API Status'}
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {status && (
        <div className="mt-4">
          <Card className="mb-4">
            <Card.Header>
              <strong>API Gateway Status</strong>
            </Card.Header>
            <Card.Body>
              <p>
                <strong>Status:</strong> {renderStatusIndicator(status.gateway?.status || 'unknown')}
              </p>
              <p>
                <strong>Message:</strong> {status.gateway?.message || 'No information available'}
              </p>
              <p>
                <strong>Timestamp:</strong> {new Date(status.timestamp).toLocaleString()}
              </p>
            </Card.Body>
          </Card>
          
          <h4 className="mt-4 mb-3">Microservices Status</h4>
          <div className="row">
            <div className="col-md-6 mb-4">
              <Card>
                <Card.Header>
                  <strong>Scraper Service</strong>
                </Card.Header>
                <Card.Body>
                  <p>
                    <strong>Status:</strong> {renderStatusIndicator(status.services?.scraper?.status || 'unknown')}
                  </p>
                  <p>
                    <strong>Message:</strong> {status.services?.scraper?.message || 'No information available'}
                  </p>
                  <p>
                    <strong>URL:</strong> {status.services?.scraper?.url || API_CONFIG.SCRAPER_API}
                  </p>
                </Card.Body>
              </Card>
            </div>
            
            <div className="col-md-6 mb-4">
              <Card>
                <Card.Header>
                  <strong>Analytics Service</strong>
                </Card.Header>
                <Card.Body>
                  <p>
                    <strong>Status:</strong> {renderStatusIndicator(status.services?.analytics?.status || 'unknown')}
                  </p>
                  <p>
                    <strong>Message:</strong> {status.services?.analytics?.message || 'No information available'}
                  </p>
                  <p>
                    <strong>URL:</strong> {status.services?.analytics?.url || API_CONFIG.ANALYTICS_API}
                  </p>
                </Card.Body>
              </Card>
            </div>
          </div>
          
          <h4 className="mt-4 mb-3">API Configuration</h4>
          <Card>
            <Card.Header>
              <strong>Service URLs</strong>
            </Card.Header>
            <Card.Body>
              <p>
                <strong>Main API:</strong> {API_CONFIG.MAIN_API}
              </p>
              <p>
                <strong>Analytics API:</strong> {API_CONFIG.ANALYTICS_API}
              </p>
              <p>
                <strong>Scraper API:</strong> {API_CONFIG.SCRAPER_API}
              </p>
            </Card.Body>
          </Card>
        </div>
      )}
      
      {loading && !status && (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">Checking API status...</p>
        </div>
      )}
    </div>
  );
}

export default APITest;