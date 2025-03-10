"""
Data access layer for the Instagram AI Leaderboard application.
Provides a repository pattern for database operations with fallback to file-based storage.
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, update
from models import Account, Snapshot, ScrapeStats, PendingAccount, ProfileImage
from datetime import datetime, timedelta
import logging
import json
import os
import hashlib
from config import DATA_DIR, IMAGE_CACHE_DIR

logger = logging.getLogger('repository')

# Account functions
def get_accounts(db: Session = None):
    """Get all active accounts with database or file fallback"""
    if db:
        try:
            accounts = db.query(Account).filter(Account.is_active == True).all()
            return [account.username for account in accounts]
        except Exception as e:
            logger.error(f"Database error in get_accounts: {str(e)}")
            db.rollback()
    
    # Fallback to file-based storage
    try:
        with open('accounts.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading accounts from file: {str(e)}")
        return []

def get_account_by_username(db: Session, username: str):
    """Get account by username"""
    try:
        return db.query(Account).filter(Account.username == username).first()
    except Exception as e:
        logger.error(f"Error in get_account_by_username: {str(e)}")
        db.rollback()
        return None

def create_account(db: Session, username: str):
    """Create a new account with database or file fallback"""
    if db:
        try:
            account = Account(username=username, is_active=True)
            db.add(account)
            db.commit()
            db.refresh(account)
            return account
        except Exception as e:
            logger.error(f"Database error in create_account: {str(e)}")
            db.rollback()
    
    # Fallback to file-based storage
    try:
        accounts = []
        try:
            with open('accounts.json', 'r') as f:
                accounts = json.load(f)
        except FileNotFoundError:
            pass
        
        if username not in accounts:
            accounts.append(username)
            with open('accounts.json', 'w') as f:
                json.dump(accounts, f)
        return {"username": username}
    except Exception as e:
        logger.error(f"Error saving account to file: {str(e)}")
        return None

# Snapshot functions
def create_snapshot(db: Session, account_id: int, follower_count: int, bio: str, profile_img_url: str):
    """Create a new snapshot"""
    try:
        snapshot = Snapshot(
            account_id=account_id,
            follower_count=follower_count,
            bio=bio,
            profile_img_url=profile_img_url,
            scraped_at=datetime.now()
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot
    except Exception as e:
        logger.error(f"Error in create_snapshot: {str(e)}")
        db.rollback()
        return None

def get_latest_snapshots(db: Session = None):
    """Get the latest snapshot for each account with database or file fallback"""
    if db:
        try:
            # Get all active accounts
            accounts = db.query(Account).filter(Account.is_active == True).all()
            result = []
            
            for account in accounts:
                # Get the latest snapshot
                latest = db.query(Snapshot).filter(
                    Snapshot.account_id == account.id
                ).order_by(desc(Snapshot.scraped_at)).first()
                
                if latest:
                    # Get the previous snapshot for follower change
                    previous = db.query(Snapshot).filter(
                        Snapshot.account_id == account.id,
                        Snapshot.scraped_at < latest.scraped_at
                    ).order_by(desc(Snapshot.scraped_at)).first()
                    
                    follower_change = None
                    if previous:
                        follower_change = latest.follower_count - previous.follower_count
                    
                    # Check if profile image is in database or filesystem
                    profile_img_url = latest.profile_img_url
                    if profile_img_url and profile_img_url.startswith('http'):
                        try:
                            # Generate hash for the URL
                            url_hash = hashlib.md5(profile_img_url.encode()).hexdigest()
                            
                            # Check if image exists in filesystem
                            cache_path = os.path.join(IMAGE_CACHE_DIR, f"{url_hash}.jpg")
                            if os.path.exists(cache_path):
                                profile_img_url = f"md5:{url_hash}"
                            else:
                                # Check if image exists in database
                                image = get_profile_image_by_hash(db, url_hash)
                                if image:
                                    profile_img_url = f"md5:{url_hash}"
                        except Exception as img_err:
                            logger.error(f"Error checking for cached image: {str(img_err)}")
                    
                    result.append({
                        "username": account.username,
                        "follower_count": latest.follower_count,
                        "bio": latest.bio,
                        "profile_img_url": profile_img_url,
                        "timestamp": latest.scraped_at.isoformat(),
                        "follower_change": follower_change
                    })
            
            return result
        except Exception as e:
            logger.error(f"Database error in get_latest_snapshots: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            db.rollback()
    
    # Fallback to file-based storage
    try:
        latest_data_path = os.path.join(DATA_DIR, 'latest_data.json')
        if os.path.exists(latest_data_path):
            with open(latest_data_path, 'r') as f:
                return json.load(f)
        else:
            return []
    except Exception as e:
        logger.error(f"Error loading latest data from file: {str(e)}")
        return []

# Stats functions
def create_scrape_stats(db: Session, duration: float, accounts_total: int, 
                        accounts_successful: int, total_followers: int, method: str):
    """Create a new scrape stats record"""
    try:
        stats = ScrapeStats(
            timestamp=datetime.now(),
            duration_seconds=duration,
            accounts_total=accounts_total,
            accounts_successful=accounts_successful,
            total_followers=total_followers,
            method=method
        )
        db.add(stats)
        db.commit()
        db.refresh(stats)
        return stats
    except Exception as e:
        logger.error(f"Error in create_scrape_stats: {str(e)}")
        db.rollback()
        return None

def get_trend_data(db: Session = None, days=30):
    """Get trending data for all accounts with database or file fallback"""
    if db:
        try:
            # Get all accounts
            accounts = db.query(Account).filter(Account.is_active == True).all()
            
            # Get the unique dates with snapshots (limit to last 30 days)
            min_date = datetime.now() - timedelta(days=days)
            date_results = db.query(
                func.date_trunc('day', Snapshot.scraped_at).label('date')
            ).filter(
                Snapshot.scraped_at >= min_date
            ).group_by(
                func.date_trunc('day', Snapshot.scraped_at)
            ).order_by(
                func.date_trunc('day', Snapshot.scraped_at)
            ).all()
            
            dates = [str(result.date.date()) for result in date_results]
            
            # Initialize data structure
            trend_data = {}
            for account in accounts:
                trend_data[account.username] = {
                    'username': account.username,
                    'data_points': []
                }
            
            # For each date, find the latest snapshot for each account
            for date_str in dates:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                next_date = date_obj + timedelta(days=1)
                
                # For each account, find the snapshot closest to the end of this day
                for account in accounts:
                    snapshot = db.query(Snapshot).filter(
                        Snapshot.account_id == account.id,
                        Snapshot.scraped_at >= date_obj,
                        Snapshot.scraped_at < next_date
                    ).order_by(desc(Snapshot.scraped_at)).first()
                    
                    if snapshot:
                        trend_data[account.username]['data_points'].append({
                            'date': date_str,
                            'follower_count': snapshot.follower_count
                        })
            
            # Convert to list
            trends_list = list(trend_data.values())
            
            # Sort by most recent follower count (if available)
            def get_latest_count(item):
                points = item.get('data_points', [])
                if points:
                    return points[-1].get('follower_count', 0)
                return 0
                
            trends_list = sorted(trends_list, key=get_latest_count, reverse=True)
            
            return {'trends': trends_list, 'dates': dates}
        except Exception as e:
            logger.error(f"Database error in get_trend_data: {str(e)}")
            db.rollback()
    
    # Fallback to file-based storage
    try:
        # Find all historical JSON files
        json_files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json') and 'instagram_data_' in f]
        
        if not json_files:
            return {'trends': [], 'dates': []}
        
        # Sort files by date (newest first)
        json_files.sort(reverse=True)
        
        # Load the most recent files
        historical_data = {}
        for file in json_files[:10]:
            try:
                file_path = os.path.join(DATA_DIR, file)
                # Extract date from filename
                date_str = file.replace('instagram_data_', '').replace('.json', '')
                date = datetime.strptime(date_str, '%Y%m%d_%H%M%S')
                
                with open(file_path, 'r') as f:
                    file_data = json.load(f)
                    # Format as YYYY-MM-DD
                    date_formatted = date.strftime('%Y-%m-%d')
                    historical_data[date_formatted] = file_data
            except Exception as e:
                logger.error(f"Error processing historical file {file}: {str(e)}")
                continue
        
        # Format the trend data by account
        trend_data = {}
        dates = sorted(historical_data.keys())
        
        # Initialize trend data structure
        for date in dates:
            data_points = historical_data[date]
            for profile in data_points:
                username = profile.get('username')
                if username not in trend_data:
                    trend_data[username] = {
                        'username': username,
                        'data_points': []
                    }
        
        # Fill in trend data
        for date in dates:
            data_points = historical_data[date]
            
            # Create lookup by username
            data_by_username = {item['username']: item for item in data_points if 'username' in item}
            
            # Add data points for each account
            for username in trend_data:
                if username in data_by_username:
                    follower_count = data_by_username[username].get('follower_count')
                    if follower_count is not None:
                        trend_data[username]['data_points'].append({
                            'date': date,
                            'follower_count': follower_count
                        })
        
        # Convert to list
        trends_list = list(trend_data.values())
        
        # Sort by most recent follower count
        def get_latest_count(item):
            points = item.get('data_points', [])
            if points:
                return points[-1].get('follower_count', 0)
            return 0
            
        trends_list = sorted(trends_list, key=get_latest_count, reverse=True)
        
        return {'trends': trends_list, 'dates': dates}
    except Exception as e:
        logger.error(f"Error loading trend data from files: {str(e)}")
        return {'trends': [], 'dates': []}

# Pending account functions
def get_pending_accounts(db: Session = None):
    """Get all pending accounts with database or file fallback"""
    if db:
        try:
            pending = db.query(PendingAccount).all()
            return [{'username': p.username, 'submitter': p.submitter, 'timestamp': p.submitted_at.isoformat()} for p in pending]
        except Exception as e:
            logger.error(f"Database error in get_pending_accounts: {str(e)}")
            db.rollback()
    
    # Fallback to file-based storage
    try:
        if os.path.exists('pending_accounts.json'):
            with open('pending_accounts.json', 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading pending accounts from file: {str(e)}")
        return []

def create_pending_account(db: Session, username: str, submitter: str):
    """Create a new pending account with database or file fallback"""
    if db:
        try:
            pending = PendingAccount(
                username=username,
                submitter=submitter,
                submitted_at=datetime.now()
            )
            db.add(pending)
            db.commit()
            db.refresh(pending)
            return True, "Account submitted successfully"
        except Exception as e:
            logger.error(f"Database error in create_pending_account: {str(e)}")
            db.rollback()
            return False, f"Database error: {str(e)}"
    
    # Fallback to file-based storage
    try:
        pending = []
        try:
            with open('pending_accounts.json', 'r') as f:
                pending = json.load(f)
        except FileNotFoundError:
            pass
        
        # Check if account already exists
        if any(acct.get('username') == username for acct in pending):
            return False, "This account is already pending approval"
        
        # Add new pending account
        pending.append({
            'username': username,
            'submitter': submitter,
            'timestamp': datetime.now().isoformat()
        })
        
        with open('pending_accounts.json', 'w') as f:
            json.dump(pending, f)
        
        return True, "Account submitted successfully"
    except Exception as e:
        logger.error(f"Error saving pending account to file: {str(e)}")
        return False, f"Error: {str(e)}"

def delete_pending_account(db: Session, username: str):
    """Delete a pending account with database or file fallback"""
    if db:
        try:
            pending = db.query(PendingAccount).filter(PendingAccount.username == username).first()
            if pending:
                db.delete(pending)
                db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Database error in delete_pending_account: {str(e)}")
            db.rollback()
            return False
    
    # Fallback to file-based storage
    try:
        if os.path.exists('pending_accounts.json'):
            with open('pending_accounts.json', 'r') as f:
                pending = json.load(f)
            
            # Filter out the specified account
            new_pending = [acct for acct in pending if acct.get('username') != username]
            
            # Save the updated list
            if len(new_pending) != len(pending):
                with open('pending_accounts.json', 'w') as f:
                    json.dump(new_pending, f)
                return True
        return False
    except Exception as e:
        logger.error(f"Error removing pending account from file: {str(e)}")
        return False

# Profile Image functions
def get_profile_image_by_hash(db: Session, url_hash: str):
    """Get a profile image by its URL hash from database"""
    if not db:
        return None
        
    try:
        return db.query(ProfileImage).filter(ProfileImage.url_hash == url_hash).first()
    except Exception as e:
        logger.error(f"Error in get_profile_image_by_hash: {str(e)}")
        db.rollback()
        return None

def create_profile_image(db: Session, url_hash: str, source_url: str, 
                        image_data: bytes, content_type: str, username: str):
    """Create a new profile image entry in database and filesystem"""
    # Always save to filesystem as a backup
    try:
        # Ensure image cache directory exists
        os.makedirs(IMAGE_CACHE_DIR, exist_ok=True)
        
        # Save to filesystem
        file_path = os.path.join(IMAGE_CACHE_DIR, f"{url_hash}.jpg")
        with open(file_path, 'wb') as f:
            f.write(image_data)
        logger.info(f"Saved image to filesystem: {file_path}")
    except Exception as e:
        logger.error(f"Error saving image to filesystem: {str(e)}")
    
    # Save to database if available
    if db:
        try:
            # Check if image already exists
            existing_image = db.query(ProfileImage).filter(ProfileImage.url_hash == url_hash).first()
            if existing_image:
                logger.info(f"Image with hash {url_hash} already exists in database, updating access time")
                existing_image.last_accessed = datetime.now()
                db.commit()
                return existing_image
                
            # Create new image entry
            logger.info(f"Creating new profile image in database: {url_hash}, size: {len(image_data)} bytes")
            profile_image = ProfileImage(
                url_hash=url_hash,
                source_url=source_url,
                image_data=image_data,
                content_type=content_type,
                username=username,
                cached_at=datetime.now(),
                last_accessed=datetime.now()
            )
            db.add(profile_image)
            db.commit()
            db.refresh(profile_image)
            return profile_image
        except Exception as e:
            logger.error(f"Error saving profile image to database: {str(e)}")
            db.rollback()
    
    return None

def update_profile_image_access(db: Session, url_hash: str):
    """Update the last accessed timestamp for an image"""
    if not db:
        return False
        
    try:
        result = db.execute(
            update(ProfileImage)
            .where(ProfileImage.url_hash == url_hash)
            .values(last_accessed=datetime.now())
        )
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error updating image access time: {str(e)}")
        db.rollback()
        return False