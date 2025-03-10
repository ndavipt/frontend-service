import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import ProfileCard from '../components/ProfileCard';
import { getLeaderboard, triggerScrape } from '../services/api';

function Leaderboard() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getLeaderboard(forceRefresh);
      
      setProfiles(data.profiles || []);
      setLastUpdated(data.timestamp ? new Date(data.timestamp) : new Date());
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load leaderboard data. Please try again later.');
      setLoading(false);
      console.error('Error loading leaderboard:', err);
    }
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleCollectNewData = async () => {
    try {
      setScraping(true);
      setScrapeSuccess(null);
      
      const result = await triggerScrape();
      
      setScrapeSuccess(result.status === 'success');
      setScraping(false);
      
      // If successful, wait a moment and then refresh the data
      if (result.status === 'success') {
        setTimeout(() => fetchData(true), 2000);
      }
    } catch (err) {
      setScrapeSuccess(false);
      setScraping(false);
      console.error('Error triggering scrape:', err);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Instagram AI Leaderboard</h1>
        <div>
          <Button 
            variant="primary" 
            onClick={handleRefresh} 
            className="me-2"
            disabled={loading || scraping}
          >
            {loading ? <Spinner size="sm" animation="border" /> : 'Refresh'}
          </Button>
          <Button 
            variant="success" 
            onClick={handleCollectNewData}
            disabled={loading || scraping}
          >
            {scraping ? <><Spinner size="sm" animation="border" /> Collecting...</> : 'Collect New Data'}
          </Button>
        </div>
      </div>
      
      {scrapeSuccess === true && (
        <Alert variant="success" dismissible onClose={() => setScrapeSuccess(null)}>
          Data collection successfully triggered! The leaderboard will update shortly.
        </Alert>
      )}
      
      {scrapeSuccess === false && (
        <Alert variant="danger" dismissible onClose={() => setScrapeSuccess(null)}>
          Failed to trigger data collection. Please try again later.
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Total Accounts:</strong> {profiles.length}
          </div>
          <div>
            <strong>Last Updated:</strong> {lastUpdated?.toLocaleString() || 'N/A'}
          </div>
        </Card.Body>
      </Card>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading leaderboard data...</p>
        </div>
      ) : (
        <Row>
          {profiles.map((profile, index) => (
            <Col key={profile.username} md={6} lg={4} xl={3}>
              <ProfileCard profile={profile} rank={index + 1} />
            </Col>
          ))}
          
          {profiles.length === 0 && !loading && !error && (
            <Col xs={12}>
              <Alert variant="info">
                No profiles found. Start tracking some Instagram accounts to see them here!
              </Alert>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}

export default Leaderboard;