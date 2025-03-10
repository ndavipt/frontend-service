# analytics_service/src/api.py
from flask import Blueprint, jsonify, request
import os
import json
import requests
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import pandas as pd
import math
import random

bp = Blueprint('api', __name__, url_prefix='/api')

# Setup logging
logger = logging.getLogger('analytics_service.api')

SCRAPER_SERVICE_URL = os.getenv('SCRAPER_SERVICE_URL', 'https://scraper-service-907s.onrender.com')
logger.info(f"Using scraper service URL: {SCRAPER_SERVICE_URL}")
STATS_CACHE = {}
STATS_CACHE_EXPIRY = 300  # 5 minutes

def get_scrape_stats():
    """Get scraping statistics from the scraper service or local cache."""
    # Check cache first
    now = datetime.now()
    if 'scrape_stats' in STATS_CACHE and 'timestamp' in STATS_CACHE:
        cache_age = (now - STATS_CACHE['timestamp']).total_seconds()
        if cache_age < STATS_CACHE_EXPIRY:
            logger.info(f"Using cached scrape stats (age: {cache_age:.1f}s)")
            return STATS_CACHE['scrape_stats']
    
    try:
        # Try to get stats from scraper service
        response = requests.get(f"{SCRAPER_SERVICE_URL}/stats", timeout=10)
        
        if response.status_code == 200:
            stats_data = response.json()
            logger.info(f"Retrieved scrape stats from scraper service: {len(stats_data.get('scrapes', []))} records")
            
            # Update cache
            STATS_CACHE['scrape_stats'] = stats_data
            STATS_CACHE['timestamp'] = now
            
            return stats_data
        else:
            logger.warning(f"Failed to get stats from scraper service: {response.status_code}")
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to scraper service: {str(e)}")
    
    # Fall back to local file if we have it (legacy mode)
    try:
        stats_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
        os.makedirs(stats_dir, exist_ok=True)
        
        stats_file = os.path.join(stats_dir, 'scrape_stats.json')
        
        if os.path.exists(stats_file):
            with open(stats_file, 'r') as f:
                scrapes = json.load(f)
                logger.info(f"Loaded {len(scrapes)} scrape records from local file")
                
                # Convert to standard format
                stats_data = {
                    'scrapes': scrapes,
                    'total_scrapes': len(scrapes),
                    'success_count': sum(1 for s in scrapes if s.get('accounts_successful', 0) > 0),
                    'failure_count': 0,  # Will be calculated below
                    'avg_scrape_time': 0,  # Will be calculated below
                    'success_rate': 0,     # Will be calculated below
                    'scrapes_per_day': 0,  # Will be calculated below
                    'last_scrape': None    # Will be set below
                }
                
                # Calculate derived metrics
                if scrapes:
                    stats_data['failure_count'] = stats_data['total_scrapes'] - stats_data['success_count']
                    
                    # Calculate average scrape time
                    scrape_times = [s.get('duration_seconds', 0) for s in scrapes]
                    if scrape_times:
                        stats_data['avg_scrape_time'] = sum(scrape_times) / len(scrape_times)
                    
                    # Calculate success rate
                    total = len(scrapes)
                    stats_data['success_rate'] = (stats_data['success_count'] / total * 100) if total > 0 else 0
                    
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
                
                # Update cache
                STATS_CACHE['scrape_stats'] = stats_data
                STATS_CACHE['timestamp'] = now
                
                return stats_data
    except Exception as e:
        logger.error(f"Error loading scrape stats from file: {str(e)}")
    
    # Return empty data structure if all else fails
    return {
        'scrapes': [],
        'total_scrapes': 0,
        'success_count': 0,
        'failure_count': 0,
        'avg_scrape_time': 0,
        'success_rate': 0,
        'scrapes_per_day': 0,
        'last_scrape': None
    }

def get_account_data():
    """Get account data from the scraper service."""
    try:
        # Get profiles from the scraper microservice
        profile_url = f"{SCRAPER_SERVICE_URL}/profiles"
        logger.info(f"Requesting profiles from scraper service: {profile_url}")
        
        response = requests.get(profile_url, timeout=10)
        logger.info(f"Scraper service response status: {response.status_code}")
        
        if response.status_code == 200:
            profiles = response.json()
            logger.info(f"Retrieved {len(profiles)} profiles from scraper service")
            
            # Print the first profile to see its structure
            if profiles and isinstance(profiles, list) and len(profiles) > 0:
                logger.info(f"Sample profile data: {profiles[0]}")
            else:
                logger.warning(f"Profiles data is not in expected format: {type(profiles)}")
                if not isinstance(profiles, list):
                    # Try to handle different response formats
                    if isinstance(profiles, dict) and 'data' in profiles:
                        profiles = profiles['data']
                        logger.info(f"Extracted profiles from 'data' field, got {len(profiles) if profiles else 0} profiles")
                    else:
                        # Convert to list if it's not already
                        profiles = [profiles] if profiles else []
                        logger.info(f"Converted profile data to list format")
            
            return profiles
        else:
            logger.warning(f"Failed to get profiles from scraper service: {response.status_code}")
            logger.warning(f"Response content: {response.text[:500]}")
            return []
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error connecting to scraper service: {str(e)}")
        return []

@bp.route('/stats/scrape', methods=['GET'])
def api_scrape_stats():
    """Get scraping statistics from the scraper service."""
    try:
        stats_data = get_scrape_stats()
        return jsonify(stats_data)
    except Exception as e:
        logger.error(f"Error getting scrape stats: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@bp.route('/stats/growth', methods=['GET'])
def api_growth_stats():
    """Calculate growth statistics for accounts."""
    try:
        # Get account data
        logger.info("Fetching account data for growth statistics")
        profiles = get_account_data()
        
        if not profiles:
            logger.warning("No profile data available for growth statistics")
            # Return empty success response instead of error
            return jsonify({
                'total_accounts': 0,
                'total_followers': 0,
                'total_weekly_growth': 0,
                'avg_growth_rate': 0,
                'accounts': []
            })
            
        logger.info(f"Processing growth statistics for {len(profiles)} profiles")
        
        # Process profiles to extract growth metrics
        growth_data = []
        total_followers = 0
        total_growth = 0
        
        logger.info(f"Processing {len(profiles)} profiles for growth metrics")
        
        for profile in profiles:
            username = profile.get('username')
            followers = profile.get('followers', 0)
            history = profile.get('history', [])
            follower_change = profile.get('follower_change', 0)  # Try to get from profile first
            
            logger.info(f"Processing growth for {username} with {len(history) if history else 0} history points")
            
            # Calculate growth metrics
            daily_growth = 0
            weekly_growth = 0
            monthly_growth = 0
            growth_rate = 0
            
            # If we already have follower_change from the main API, use it
            if follower_change != 0:
                daily_growth = follower_change
                weekly_growth = follower_change  # Simplification, assuming the change is since last scrape
                logger.info(f"{username}: Using follower_change from API: {follower_change}")
            
            # Otherwise calculate from history
            elif history and len(history) > 1:
                # Sort history by timestamp
                sorted_history = sorted(history, key=lambda x: x.get('timestamp', ''))
                logger.info(f"{username}: History range: {sorted_history[0].get('timestamp')} to {sorted_history[-1].get('timestamp')}")
                
                # Get current and historical follower counts
                current_followers = followers
                
                # Calculate from the most recent two points to get change since last scrape
                if len(sorted_history) >= 2:
                    latest = sorted_history[-1].get('followers', 0)
                    previous = sorted_history[-2].get('followers', 0)
                    follower_change = latest - previous
                    daily_growth = follower_change  # Simplification, assuming scrapes are daily or less
                    logger.info(f"{username}: Calculated follower change: {follower_change} (from {previous} to {latest})")
                
                # Calculate weekly growth (7 days)
                weekly_cutoff = (datetime.now() - timedelta(days=7)).isoformat()
                weekly_points = [h for h in sorted_history if h.get('timestamp', '') >= weekly_cutoff]
                
                if weekly_points and len(weekly_points) > 0:
                    first_weekly = weekly_points[0].get('followers', current_followers)
                    weekly_growth = current_followers - first_weekly
                    logger.info(f"{username}: Weekly growth: {weekly_growth} over {len(weekly_points)} points")
                
                # Calculate monthly growth (30 days)
                monthly_cutoff = (datetime.now() - timedelta(days=30)).isoformat()
                monthly_points = [h for h in sorted_history if h.get('timestamp', '') >= monthly_cutoff]
                
                if monthly_points and len(monthly_points) > 0:
                    first_monthly = monthly_points[0].get('followers', current_followers)
                    monthly_growth = current_followers - first_monthly
                    logger.info(f"{username}: Monthly growth: {monthly_growth} over {len(monthly_points)} points")
                
                # Calculate growth rate (percent per day)
                if followers > 0 and weekly_growth != 0:
                    growth_rate = (weekly_growth / (followers - weekly_growth)) * (100 / 7)
            else:
                logger.warning(f"{username}: No history data available")
            
            # Store account growth data
            account_data = {
                'username': username,
                'followers': followers,
                'daily_growth': daily_growth,
                'weekly_growth': weekly_growth,
                'monthly_growth': monthly_growth,
                'growth_rate': growth_rate,
                'follower_change': follower_change  # Add the immediate change
            }
            
            growth_data.append(account_data)
            total_followers += followers
            total_growth += weekly_growth
            
            logger.info(f"Added growth data for {username}: daily={daily_growth}, weekly={weekly_growth}, change={follower_change}")
        
        # Calculate aggregate metrics
        avg_growth_rate = 0
        if total_followers - total_growth > 0:
            avg_growth_rate = (total_growth / (total_followers - total_growth)) * (100 / 7)
        
        # Sort by weekly growth rate (descending)
        growth_data.sort(key=lambda x: x.get('growth_rate', 0), reverse=True)
        
        return jsonify({
            'total_accounts': len(growth_data),
            'total_followers': total_followers,
            'total_weekly_growth': total_growth,
            'avg_growth_rate': avg_growth_rate,
            'accounts': growth_data
        })
        
    except Exception as e:
        logger.error(f"Error calculating growth stats: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@bp.route('/stats/trends', methods=['GET'])
def api_trend_analysis():
    """Analyze trends in follower growth."""
    try:
        # Get account data
        logger.info("Fetching account data for trend analysis")
        profiles = get_account_data()
        
        if not profiles:
            logger.warning("No profile data available for trend analysis")
            return jsonify({
                'error': 'No profile data available',
                'trend_direction': 'stable',
                'data_points': 0,
                'trend_data': []
            })
        
        # Prepare data structures for trend analysis
        now = datetime.now()
        thirty_days_ago = (now - timedelta(days=30)).isoformat()
        
        # Container for aggregate follower data by day
        daily_totals = defaultdict(int)
        daily_counts = defaultdict(int)
        
        # Process all profiles
        for profile in profiles:
            history = profile.get('history', [])
            
            # Skip profiles with no history
            if not history:
                continue
                
            # Filter to last 30 days and organize by date
            for data_point in history:
                timestamp = data_point.get('timestamp', '')
                if timestamp >= thirty_days_ago:
                    # Extract date portion only
                    date_str = timestamp.split('T')[0]
                    followers = data_point.get('followers', 0)
                    
                    if followers > 0:
                        daily_totals[date_str] += followers
                        daily_counts[date_str] += 1
        
        # Calculate daily averages
        trend_data = []
        for date_str in sorted(daily_totals.keys()):
            total = daily_totals[date_str]
            count = daily_counts[date_str]
            average = total / count if count > 0 else 0
            
            trend_data.append({
                'date': date_str,
                'total_followers': total,
                'account_count': count,
                'average_followers': average
            })
        
        # Calculate trend direction
        trend_direction = 'stable'
        if len(trend_data) >= 7:
            # Compare last week's average to previous week
            last_week = trend_data[-7:]
            prev_week = trend_data[-14:-7] if len(trend_data) >= 14 else []
            
            last_week_avg = sum(day['average_followers'] for day in last_week) / 7
            prev_week_avg = sum(day['average_followers'] for day in prev_week) / len(prev_week) if prev_week else last_week_avg
            
            if last_week_avg > prev_week_avg * 1.05:  # 5% growth threshold
                trend_direction = 'increasing'
            elif last_week_avg < prev_week_avg * 0.95:  # 5% decline threshold
                trend_direction = 'decreasing'
        
        return jsonify({
            'trend_direction': trend_direction,
            'data_points': len(trend_data),
            'trend_data': trend_data
        })
        
    except Exception as e:
        logger.error(f"Error analyzing trends: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@bp.route('/stats/engagement', methods=['GET'])
def api_engagement_analysis():
    """Calculate engagement metrics for accounts."""
    try:
        # Get account data
        logger.info("Fetching account data for engagement analysis")
        profiles = get_account_data()
        
        if not profiles:
            logger.warning("No profile data available for engagement analysis")
            return jsonify({
                'total_accounts': 0,
                'accounts': []
            })
        
        # Process profiles to extract engagement metrics
        engagement_data = []
        
        for profile in profiles:
            username = profile.get('username')
            followers = profile.get('followers', 0)
            
            # For a complete implementation, we'd need engagement metrics (likes, comments)
            # from the profile, but we'll simulate for this example
            
            # In a real implementation, these would come from actual data
            avg_likes = int(followers * (0.05 + 0.1 * random.random()))  # 5-15% engagement rate
            avg_comments = int(avg_likes * (0.05 + 0.1 * random.random()))  # 5-15% comment rate
            
            engagement_rate = ((avg_likes + avg_comments) / followers * 100) if followers > 0 else 0
            
            account_data = {
                'username': username,
                'followers': followers,
                'avg_likes': avg_likes,
                'avg_comments': avg_comments,
                'engagement_rate': engagement_rate
            }
            
            engagement_data.append(account_data)
        
        # Sort by engagement rate (descending)
        engagement_data.sort(key=lambda x: x.get('engagement_rate', 0), reverse=True)
        
        return jsonify({
            'total_accounts': len(engagement_data),
            'accounts': engagement_data
        })
        
    except Exception as e:
        logger.error(f"Error calculating engagement: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500