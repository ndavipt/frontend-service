import React, { useState, useEffect } from 'react';
import { Alert, Card, Button, Spinner } from 'react-bootstrap';
import { getTrends } from '../services/api';

function Trends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useAnalytics, setUseAnalytics] = useState(false);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getTrends(useAnalytics);
      setTrends(data.trends || []);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load trend data. Please try again later.');
      setLoading(false);
      console.error('Error loading trends:', err);
    }
  };

  const toggleAnalytics = () => {
    setUseAnalytics(!useAnalytics);
    fetchTrends();
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Growth Trends</h1>
        <div>
          <Button 
            variant={useAnalytics ? "success" : "outline-secondary"}
            onClick={toggleAnalytics}
            className="me-2"
          >
            {useAnalytics ? "Using Analytics API" : "Using Main API"}
          </Button>
          <Button 
            variant="primary" 
            onClick={fetchTrends} 
            disabled={loading}
          >
            {loading ? <Spinner size="sm" animation="border" /> : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading trend data...</p>
        </div>
      ) : (
        <div>
          {trends.length === 0 ? (
            <Alert variant="info">
              No trend data available yet. Data will appear after multiple scrapes have been performed.
            </Alert>
          ) : (
            <div className="row">
              {trends.map(trend => (
                <div key={trend.username} className="col-md-6 mb-4">
                  <Card>
                    <Card.Header>
                      <strong>@{trend.username}</strong>
                    </Card.Header>
                    <Card.Body>
                      <p>
                        <strong>Current Followers:</strong> {trend.current_followers?.toLocaleString() || 'N/A'}
                      </p>
                      <p>
                        <strong>Data Points:</strong> {trend.data_points?.length || 0}
                      </p>
                      <p>
                        <strong>Trend Summary:</strong> This account has {trend.data_points?.length > 1 ? 
                          `gained approximately ${Math.floor((trend.current_followers - trend.data_points[0].followers) / 1000)}k followers since the first measurement.` : 
                          'insufficient data points for trend analysis.'}
                      </p>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Trends;