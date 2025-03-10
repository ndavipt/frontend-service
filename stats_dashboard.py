from flask import Flask, jsonify, render_template_string
import os
import json
from datetime import datetime, timedelta
import logging
from collections import defaultdict
from db import get_db, is_db_available
import repository

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("stats_dashboard.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('stats_dashboard')

# Add these routes to the existing app.py Flask application
def register_stats_routes(app):
    @app.route('/api/stats/scrape', methods=['GET'])
    def get_scrape_stats():
        """Get scraping statistics from the database or stats/scrape_stats.json"""
        try:
            # Default response structure
            stats_data = {
                'scrapes': [],
                'total_scrapes': 0,
                'success_count': 0,
                'failure_count': 0,
                'avg_scrape_time': 0,
                'success_rate': 0,
                'scrapes_per_day': 0,
                'last_scrape': None
            }
            
            # Try to get stats from database first
            scrapes = []
            if is_db_available():
                logger.info("Using database for scrape stats")
                db = get_db()
                
                # Get all scrape stats records from database
                db_stats = repository.get_all_scrape_stats(db)
                
                # Convert to dictionaries
                scrapes = [
                    {
                        'timestamp': stat.timestamp.isoformat(),
                        'duration_seconds': float(stat.duration_seconds),
                        'accounts_total': stat.accounts_total,
                        'accounts_successful': stat.accounts_successful,
                        'total_followers': stat.total_followers,
                        'method': stat.method
                    }
                    for stat in db_stats
                ]
                
                logger.info(f"Retrieved {len(scrapes)} scrape records from database")
            else:
                # Fall back to file-based storage
                logger.info("Database not available, using file-based scrape stats")
                
                # Check if stats directory exists, create if not
                stats_dir = 'stats'
                os.makedirs(stats_dir, exist_ok=True)
                
                # Path to the stats file
                stats_file = os.path.join(stats_dir, 'scrape_stats.json')
                
                # Try to load existing stats file
                if os.path.exists(stats_file):
                    with open(stats_file, 'r') as f:
                        scrapes = json.load(f)
                        logger.info(f"Loaded {len(scrapes)} scrape records from file")
            
            # Calculate statistics from the data
            if scrapes:
                stats_data['scrapes'] = scrapes
                
                # Calculate average scrape time
                scrape_times = [s.get('duration_seconds', 0) for s in scrapes]
                if scrape_times:
                    stats_data['avg_scrape_time'] = sum(scrape_times) / len(scrape_times)
                
                # Calculate success rate
                total = len(scrapes)
                success_count = sum(1 for s in scrapes if s.get('accounts_successful', 0) > 0)
                failed_count = total - success_count
                
                stats_data['success_count'] = success_count
                stats_data['failure_count'] = failed_count
                stats_data['total_scrapes'] = total
                stats_data['success_rate'] = (success_count / total * 100) if total > 0 else 0
                
                # Calculate scrapes per day (over the last 7 days)
                now = datetime.now()
                week_ago = now - timedelta(days=7)
                
                # Count scrapes by day
                scrapes_by_day = defaultdict(int)
                
                for scrape in scrapes:
                    try:
                        timestamp = scrape.get('timestamp')
                        if timestamp:
                            scrape_time = datetime.fromisoformat(timestamp)
                            if scrape_time > week_ago:
                                date = scrape_time.date()
                                scrapes_by_day[date.isoformat()] += 1
                    except (ValueError, KeyError) as e:
                        logger.warning(f"Error parsing timestamp: {e}")
                
                # Calculate average scrapes per day
                if scrapes_by_day:
                    stats_data['scrapes_per_day'] = sum(scrapes_by_day.values()) / 7
                    stats_data['scrapes_by_day'] = dict(scrapes_by_day)
                
                # Get the timestamp of the last scrape
                if scrapes:
                    sorted_scrapes = sorted(scrapes, 
                                           key=lambda x: datetime.fromisoformat(x['timestamp']) 
                                           if 'timestamp' in x else datetime.min)
                    last_scrape = sorted_scrapes[-1]
                    stats_data['last_scrape'] = last_scrape.get('timestamp')
            
            return jsonify(stats_data)
        except Exception as e:
            logger.error(f"Error getting scrape stats: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    
    @app.route('/stats', methods=['GET'])
    def stats_dashboard():
        """Serve a basic HTML page that displays scraping statistics"""
        stats_html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Instagram AI Leaderboard - Scraping Stats</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body {
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .stats-card {
                    margin-bottom: 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .card-header {
                    font-weight: bold;
                    background-color: #f7f7f7;
                }
                .chart-container {
                    height: 300px;
                    margin-top: 20px;
                }
                .status-indicator {
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 5px;
                }
                .status-success {
                    background-color: #28a745;
                }
                .status-failure {
                    background-color: #dc3545;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="row mb-4">
                    <div class="col-12">
                        <h1 class="mb-3">Scraping Statistics Dashboard</h1>
                        <p class="text-muted">Instagram AI Leaderboard Project</p>
                        <div id="loading" class="alert alert-info">Loading statistics...</div>
                        <div id="error" class="alert alert-danger" style="display: none;"></div>
                    </div>
                </div>
                
                <div class="row mb-4" id="scraper-controls" style="display: none;">
                    <div class="col-12">
                        <div class="card stats-card">
                            <div class="card-header">Scraper Controls</div>
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-3">
                                        <div class="form-group mb-3">
                                            <label for="frequency-input" class="form-label">Scrape Frequency (minutes)</label>
                                            <input type="number" class="form-control" id="frequency-input" min="15" max="1440" value="20">
                                            <div class="form-text">Set between 15 minutes and 24 hours (1440 minutes)</div>
                                        </div>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button id="set-frequency-btn" class="btn btn-secondary mb-3">Update Frequency</button>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button id="run-scraper-btn" class="btn btn-primary mb-3">Run Now</button>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button id="toggle-scheduler-btn" class="btn btn-success mb-3">Enable Scheduler</button>
                                    </div>
                                    <div class="col-md-2 d-flex align-items-end">
                                        <button id="stop-scraper-btn" class="btn btn-danger mb-3">Stop Scraper</button>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="alert alert-info mb-0" id="scraper-status" style="min-height: 100px;">
                                            Scraper Status: Unknown
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4" id="stats-overview" style="display: none;">
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-header">Total Scrapes</div>
                            <div class="card-body">
                                <h2 id="total-scrapes">-</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-header">Success Rate</div>
                            <div class="card-body">
                                <h2 id="success-rate">-</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-header">Avg. Scrape Time</div>
                            <div class="card-body">
                                <h2 id="avg-time">-</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card stats-card">
                            <div class="card-header">Scrapes per Day</div>
                            <div class="card-body">
                                <h2 id="scrapes-per-day">-</h2>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row mb-4" id="charts-container" style="display: none;">
                    <div class="col-md-6">
                        <div class="card stats-card">
                            <div class="card-header">Daily Scrapes (Last 7 Days)</div>
                            <div class="card-body">
                                <div class="chart-container">
                                    <canvas id="daily-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card stats-card">
                            <div class="card-header">Success vs Failures</div>
                            <div class="card-body">
                                <div class="chart-container">
                                    <canvas id="success-chart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row" id="recent-container" style="display: none;">
                    <div class="col-12">
                        <div class="card stats-card">
                            <div class="card-header">Recent Scrape Operations</div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Timestamp</th>
                                                <th>Duration</th>
                                                <th>Accounts</th>
                                                <th>Success Rate</th>
                                                <th>Total Followers</th>
                                            </tr>
                                        </thead>
                                        <tbody id="recent-scrapes">
                                            <!-- Will be populated with JavaScript -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    // Fetch the stats data
                    fetch('/api/stats/scrape')
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok');
                            }
                            return response.json();
                        })
                        .then(data => {
                            // Hide loading indicator
                            document.getElementById('loading').style.display = 'none';
                            
                            // Show stats containers
                            document.getElementById('scraper-controls').style.display = 'flex';
                            document.getElementById('stats-overview').style.display = 'flex';
                            document.getElementById('charts-container').style.display = 'flex';
                            document.getElementById('recent-container').style.display = 'block';
                            
                            // Update the stats
                            document.getElementById('total-scrapes').textContent = data.total_scrapes || 0;
                            document.getElementById('success-rate').textContent = `${(data.success_rate || 0).toFixed(1)}%`;
                            document.getElementById('avg-time').textContent = `${(data.avg_scrape_time || 0).toFixed(2)}s`;
                            document.getElementById('scrapes-per-day').textContent = (data.scrapes_per_day || 0).toFixed(1);
                            
                            // Add scraper controls functionality
                            setupScraperControls();
                            
                            // Create daily scrapes chart
                            if (data.scrapes_by_day) {
                                const labels = Object.keys(data.scrapes_by_day).sort();
                                const values = labels.map(date => data.scrapes_by_day[date]);
                                
                                new Chart(document.getElementById('daily-chart'), {
                                    type: 'bar',
                                    data: {
                                        labels: labels,
                                        datasets: [{
                                            label: 'Scrapes',
                                            data: values,
                                            backgroundColor: '#3498db'
                                        }]
                                    },
                                    options: {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                ticks: {
                                                    precision: 0
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                            
                            // Create success vs failure chart
                            new Chart(document.getElementById('success-chart'), {
                                type: 'pie',
                                data: {
                                    labels: ['Success', 'Failure'],
                                    datasets: [{
                                        data: [data.success_count || 0, data.failure_count || 0],
                                        backgroundColor: ['#28a745', '#dc3545']
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false
                                }
                            });
                            
                            // Populate recent scrapes table
                            const recentTable = document.getElementById('recent-scrapes');
                            
                            // Get the 10 most recent scrapes
                            const recentScrapes = (data.scrapes || []).slice(-10).reverse();
                            
                            recentScrapes.forEach(scrape => {
                                const row = document.createElement('tr');
                                
                                // Format the timestamp with UTC correction
                                const date = new Date(scrape.timestamp);
                                // Format date in local timezone with explicit display of timezone
                                const formattedDate = new Date(date).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true,
                                    timeZoneName: 'short'
                                });
                                
                                // Calculate success rate for this scrape
                                const successRate = scrape.accounts_total > 0 
                                    ? (scrape.accounts_successful / scrape.accounts_total * 100).toFixed(1)
                                    : 0;
                                
                                row.innerHTML = `
                                    <td title="Original ISO timestamp: ${scrape.timestamp}">${formattedDate}</td>
                                    <td>${scrape.duration_seconds?.toFixed(2) || '-'} sec</td>
                                    <td>${scrape.accounts_successful || 0}/${scrape.accounts_total || 0}</td>
                                    <td>${successRate}%</td>
                                    <td>${scrape.total_followers?.toLocaleString() || 0}</td>
                                `;
                                
                                recentTable.appendChild(row);
                            });
                            
                            if (recentScrapes.length === 0) {
                                const row = document.createElement('tr');
                                row.innerHTML = '<td colspan="5" class="text-center">No scrape operations recorded yet</td>';
                                recentTable.appendChild(row);
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching stats:', error);
                            document.getElementById('loading').style.display = 'none';
                            const errorEl = document.getElementById('error');
                            errorEl.textContent = `Error loading statistics: ${error.message}`;
                            errorEl.style.display = 'block';
                        });
                });
                
                // Function to setup the scraper controls
                function setupScraperControls() {
                    // Get references to elements
                    const frequencyInput = document.getElementById('frequency-input');
                    const setFrequencyBtn = document.getElementById('set-frequency-btn');
                    const runScraperBtn = document.getElementById('run-scraper-btn');
                    const toggleSchedulerBtn = document.getElementById('toggle-scheduler-btn');
                    const stopScraperBtn = document.getElementById('stop-scraper-btn');
                    const scraperStatusEl = document.getElementById('scraper-status');
                    
                    // Track scheduler state
                    let schedulerEnabled = false;
                    let currentStatus = 'idle';
                    
                    // Update the status display
                    function updateStatus() {
                        fetch('/api/scraper/status')
                            .then(response => response.json())
                            .then(data => {
                                const status = data.status;
                                const frequency = data.frequency;
                                currentStatus = status;
                                
                                // Update status display
                                let statusClass = 'info';
                                if (status === 'running') statusClass = 'success';
                                if (status === 'error') statusClass = 'danger';
                                
                                let statusHtml = `<strong>Status:</strong> ${status}<br>`;
                                
                                // Show scheduler state
                                statusHtml += `<strong>Scheduler:</strong> ${schedulerEnabled ? 'Enabled' : 'Disabled'}<br>`;
                                statusHtml += `<strong>Frequency:</strong> ${frequency} minutes`;
                                
                                // Add last run information if available
                                if (data.stats && data.stats.last_run_readable) {
                                    statusHtml += `<br><strong>Last run:</strong> ${data.stats.last_run_readable}`;
                                    if (data.stats.duration_formatted) {
                                        statusHtml += ` (duration: ${data.stats.duration_formatted})`;
                                    }
                                } else if (data.last_run) {
                                    const lastRunDate = new Date(data.last_run);
                                    statusHtml += `<br><strong>Last run:</strong> ${lastRunDate.toLocaleString()}`;
                                }
                                
                                // Add progress bar if running
                                if (status === 'running' || (data.stats && data.stats.status === 'running')) {
                                    const percent = data.percent_complete || 0;
                                    statusHtml += `<div class="progress mt-2 mb-1" style="height: 20px;">
                                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                             role="progressbar" 
                                             style="width: ${percent}%" 
                                             aria-valuenow="${percent}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                            ${percent}%
                                        </div>
                                    </div>`;
                                    
                                    // Add time information if available
                                    if (data.stats && data.stats.current_duration_formatted) {
                                        const timeInfo = `Elapsed: ${data.stats.current_duration_formatted}`;
                                        const remaining = data.stats && data.stats.progress_percent ? 
                                            Math.round((data.stats.current_duration_seconds / data.stats.progress_percent * 100) - data.stats.current_duration_seconds) : 0;
                                        
                                        const remainingFormatted = remaining > 0 ? 
                                            new Date(remaining * 1000).toISOString().substr(11, 8) : "00:00:00";
                                            
                                        const fullTimeInfo = data.stats.progress_percent > 0 ? 
                                            `${timeInfo} | Remaining: ~${remainingFormatted}` : timeInfo;
                                            
                                        statusHtml += `<div class="text-muted small mb-1">${fullTimeInfo}</div>`;
                                    } else if (data.time_info) {
                                        statusHtml += `<div class="text-muted small mb-1">${data.time_info}</div>`;
                                    }
                                }
                                
                                // Add progress info if available
                                if (data.progress) {
                                    statusHtml += `<small>${data.progress}</small>`;
                                }
                                
                                scraperStatusEl.className = `alert alert-${statusClass} mb-0`;
                                scraperStatusEl.innerHTML = statusHtml;
                                
                                // Update input with current frequency
                                frequencyInput.value = frequency;
                                
                                // Disable run button if already running
                                runScraperBtn.disabled = status === 'running' || (data.stats && data.stats.status === 'running');
                                
                                // Update scheduler button text based on state
                                toggleSchedulerBtn.textContent = schedulerEnabled ? 'Disable Scheduler' : 'Enable Scheduler';
                                toggleSchedulerBtn.className = schedulerEnabled ? 'btn btn-warning mb-3' : 'btn btn-success mb-3';
                            })
                            .catch(error => {
                                console.error('Error fetching scraper status:', error);
                                scraperStatusEl.className = 'alert alert-danger mb-0';
                                scraperStatusEl.textContent = 'Error fetching status';
                            });
                    }
                    
                    // Set up the frequency update
                    setFrequencyBtn.addEventListener('click', function() {
                        const newFrequency = parseInt(frequencyInput.value);
                        if (isNaN(newFrequency) || newFrequency < 15 || newFrequency > 1440) {
                            alert('Please enter a valid frequency between 15 minutes and 24 hours (1440 minutes)');
                            return;
                        }
                        
                        fetch('/api/scraper/frequency', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                frequency: newFrequency
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                alert(`Frequency updated to ${newFrequency} minutes`);
                                updateStatus();
                            } else {
                                alert(`Error: ${data.message}`);
                            }
                        })
                        .catch(error => {
                            console.error('Error updating frequency:', error);
                            alert('Error updating frequency');
                        });
                    });
                    
                    // Set up the run scraper now button (one-time run)
                    runScraperBtn.addEventListener('click', function() {
                        if (currentStatus === 'running') {
                            alert('Scraper is already running. Please wait for it to complete.');
                            return;
                        }
                        
                        fetch('/api/scraper/start', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                frequency: parseInt(frequencyInput.value),
                                one_time: true // Signal that this is a one-time run
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'started') {
                                runScraperBtn.disabled = true;
                                alert('Scraper started for a one-time run');
                                setTimeout(updateStatus, 1000);
                            } else {
                                alert(`Error: ${data.message}`);
                            }
                        })
                        .catch(error => {
                            console.error('Error starting scraper:', error);
                            alert('Error starting scraper');
                        });
                    });
                    
                    // Set up the toggle scheduler button
                    toggleSchedulerBtn.addEventListener('click', function() {
                        // Toggle the scheduler state
                        schedulerEnabled = !schedulerEnabled;
                        
                        // Update button appearance immediately
                        toggleSchedulerBtn.textContent = schedulerEnabled ? 'Disable Scheduler' : 'Enable Scheduler';
                        toggleSchedulerBtn.className = schedulerEnabled ? 'btn btn-warning mb-3' : 'btn btn-success mb-3';
                        
                        // Update the status text
                        updateStatus();
                        
                        // Start the scheduler if it's now enabled and not already running
                        if (schedulerEnabled && currentStatus !== 'running') {
                            fetch('/api/scraper/start', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    frequency: parseInt(frequencyInput.value),
                                    scheduler: true
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.status === 'started') {
                                    alert('Scheduler enabled. First scrape will start now.');
                                    setTimeout(updateStatus, 1000);
                                } else {
                                    alert(`Error: ${data.message}`);
                                    // Revert the toggle if there was an error
                                    schedulerEnabled = false;
                                    toggleSchedulerBtn.textContent = 'Enable Scheduler';
                                    toggleSchedulerBtn.className = 'btn btn-success mb-3';
                                }
                            })
                            .catch(error => {
                                console.error('Error enabling scheduler:', error);
                                alert('Error enabling scheduler');
                                // Revert the toggle on error
                                schedulerEnabled = false;
                                toggleSchedulerBtn.textContent = 'Enable Scheduler';
                                toggleSchedulerBtn.className = 'btn btn-success mb-3';
                            });
                        } else if (!schedulerEnabled) {
                            alert('Scheduler disabled. No new automatic scrapes will be started.');
                        }
                    });
                    
                    // Set up the stop scraper button
                    stopScraperBtn.addEventListener('click', function() {
                        if (!confirm('Are you sure you want to stop the scraper? Any in-progress scraping will be terminated.')) {
                            return;
                        }
                        
                        fetch('/api/scraper/stop', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'stopping') {
                                alert('Scraper is being stopped');
                                setTimeout(updateStatus, 1000);
                            } else if (data.status === 'not_running') {
                                alert('No scraper is currently running');
                            } else {
                                alert(`Error: ${data.message}`);
                            }
                        })
                        .catch(error => {
                            console.error('Error stopping scraper:', error);
                            alert('Error stopping scraper');
                        });
                    });
                    
                    // Check for updates to scrape_stats.json
                    let lastStatsUpdate = new Date().getTime();
                    let lastScrapeTimestamp = '';
                    
                    function updateScrapeStats() {
                        fetch('/api/stats/scrape')
                            .then(response => response.json())
                            .then(data => {
                                // Check if we have new stats
                                if (data.scrapes && data.scrapes.length > 0) {
                                    const latestTimestamp = data.scrapes[data.scrapes.length - 1].timestamp;
                                    
                                    // If latest timestamp is different, reload the page
                                    if (lastScrapeTimestamp && latestTimestamp !== lastScrapeTimestamp) {
                                        console.log('New scrape stats detected, reloading dashboard data');
                                        // Reload the page to show updated stats
                                        window.location.reload();
                                    }
                                    
                                    // Update the timestamp for next comparison
                                    lastScrapeTimestamp = latestTimestamp;
                                }
                            })
                            .catch(error => {
                                console.error('Error fetching scrape stats:', error);
                            });
                    }
                    
                    // Initial status update
                    updateStatus();
                    
                    // Initial stats check
                    updateScrapeStats();
                    
                    // Update status every 10 seconds
                    setInterval(updateStatus, 10000);
                    
                    // Check for new scrape stats every 15 seconds
                    setInterval(updateScrapeStats, 15000);
                }
            </script>
        </body>
        </html>
        """
        return render_template_string(stats_html)

# Import this file in app.py and register the routes
if __name__ == '__main__':
    # If this script is run directly, start a simple testing server
    app = Flask(__name__)
    register_stats_routes(app)
    
    print("="*80)
    print("Instagram AI Leaderboard Stats Dashboard")
    print("="*80)
    print("This is a module to be imported by app.py")
    print("Starting a test server on port 5051...")
    print("Visit http://localhost:5051/stats to view the stats dashboard")
    print("="*80)
    
    app.run(debug=True, host='0.0.0.0', port=5051)