import os
import json
import logging
import sys
import time
import datetime  # Add this for datetime calculations
from instagram_api_scraper import InstagramAPIScraper

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("new_accounts_scrape.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('scrape_new')

# New accounts to add and scrape
NEW_ACCOUNTS = [
    "lucy_moss_1",
    "sofiakimera", 
    "anniemariscalr", 
    "_hann_char_", 
    "kassidytravelsai", 
    "miaaa_fer16", 
    "linanove.lux", 
    "ceecee_ai", 
    "sentientmodels", 
    "kimochii_ai", 
    "harmony_decourcy", 
    "naomi_dreamz", 
    "jessicalovehartnett", 
    "jackiemezway", 
    "evie_scarlett_aiart", 
    "princesskaddyy"
]

def load_existing_accounts():
    """Load accounts from accounts.json file"""
    try:
        if os.path.exists('accounts.json'):
            with open('accounts.json', 'r') as f:
                return json.load(f)
        else:
            return []
    except Exception as e:
        logger.error(f"Error loading accounts: {str(e)}")
        return []
        
def save_accounts(accounts):
    """Save accounts to accounts.json file"""
    try:
        with open('accounts.json', 'w') as f:
            json.dump(accounts, f, indent=4)
        logger.info(f"Saved {len(accounts)} accounts to accounts.json")
        return True
    except Exception as e:
        logger.error(f"Error saving accounts: {str(e)}")
        return False

def add_new_accounts():
    """Add new accounts to accounts.json without duplicates"""
    # Load existing accounts
    existing = load_existing_accounts()
    
    # Track added and skipped accounts
    added = []
    skipped = []
    
    # Add only non-duplicate accounts
    for account in NEW_ACCOUNTS:
        account = account.strip()
        if account and account not in existing:
            existing.append(account)
            added.append(account)
        else:
            skipped.append(account)
    
    # Save updated accounts list
    if added:
        if save_accounts(existing):
            logger.info(f"Added {len(added)} new accounts: {', '.join(added)}")
        else:
            logger.error("Failed to save updated accounts list")
    
    if skipped:
        logger.info(f"Skipped {len(skipped)} duplicate accounts: {', '.join(skipped)}")
    
    return added, skipped, existing

def load_existing_data():
    """Load the existing scraped data"""
    try:
        data_path = os.path.join('data', 'latest_data.json')
        if os.path.exists(data_path):
            with open(data_path, 'r') as f:
                data = json.load(f)
                logger.info(f"Loaded {len(data)} existing profiles")
                return data
        else:
            logger.warning("No existing data found")
            return []
    except Exception as e:
        logger.error(f"Error loading existing data: {str(e)}")
        return []

def scrape_accounts(accounts_to_scrape, rate_limited=False):
    """Scrape the specified accounts"""
    # Load SmartProxy API key
    try:
        with open('smartproxy_config.json', 'r') as f:
            config = json.load(f)
            auth_key = config.get('auth_key')
    except Exception as e:
        logger.error(f"Error loading auth key: {str(e)}")
        return None
    
    if not auth_key:
        logger.error("No authentication key found")
        return None
    
    try:
        # Initialize API scraper
        scraper = InstagramAPIScraper(auth_key=auth_key)
        
        # If this is just for a quick test via the dashboard button,
        # don't process too many accounts
        if len(accounts_to_scrape) > 3 and not rate_limited:
            logger.info(f"Quick mode: only scraping {accounts_to_scrape[0]}")
            accounts_to_scrape = [accounts_to_scrape[0]]  # Just do the first one
        
        # Process with appropriate settings
        DELAY_SECONDS = 2 if rate_limited else 2  # Reduced delay to speed up processing
        logger.info(f"Scraping {len(accounts_to_scrape)} accounts" + 
                   (f" with {DELAY_SECONDS}s delay" if DELAY_SECONDS else ""))
        
        all_results = []
        total = len(accounts_to_scrape)
        
        # Process one at a time
        for i, username in enumerate(accounts_to_scrape):
            progress_msg = f"Scraping account {i+1}/{total}: {username}"
            logger.info(progress_msg)
            
            # Update the current time in the stats file to track ongoing progress
            try:
                # First read existing stats
                with open('scraper_stats.json', 'r') as f:
                    stats = json.load(f)
                
                # Get the original start time
                start_time = stats.get('last_run')
                
                if start_time:
                    # Calculate current elapsed time
                    now = datetime.datetime.now().astimezone()
                    start = datetime.datetime.fromisoformat(start_time)
                    elapsed = now - start
                    elapsed_seconds = elapsed.total_seconds()
                    elapsed_formatted = str(datetime.timedelta(seconds=int(elapsed_seconds)))
                    
                    # Update the stats file with current duration
                    stats['current_duration_seconds'] = elapsed_seconds
                    stats['current_duration_formatted'] = elapsed_formatted
                    stats['status'] = 'running'
                    stats['current_account'] = username
                    stats['progress_percent'] = int(i/total*100 if total > 0 else 0)
                    
                    # Write updated stats
                    with open('scraper_stats.json', 'w') as f:
                        json.dump(stats, f, indent=2)
                    
                    # Calculate estimated time remaining based on progress
                    if i > 0 and total > 0:
                        percent_done = i / total
                        if percent_done > 0:
                            total_estimated_seconds = elapsed_seconds / percent_done
                            remaining_seconds = total_estimated_seconds - elapsed_seconds
                            remaining_formatted = str(datetime.timedelta(seconds=int(remaining_seconds)))
                            time_info = f"Elapsed: {elapsed_formatted} | Remaining: ~{remaining_formatted}"
                        else:
                            time_info = f"Elapsed: {elapsed_formatted}"
                    else:
                        time_info = f"Elapsed: {elapsed_formatted}"
                else:
                    time_info = "Elapsed time: calculating..."
            except Exception as e:
                logger.error(f"Failed to calculate elapsed time: {str(e)}")
                logger.error(f"Error details: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                time_info = "Elapsed time: unknown"
                
            # Update progress file for real-time tracking
            try:
                with open('scraper_progress.txt', 'w') as f:
                    f.write(f"{progress_msg}\n")
                    f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)\n")
                    f.write(f"{time_info}")
            except Exception as e:
                logger.error(f"Failed to write progress file: {str(e)}")
            
            # Try to scrape up to 3 times with increasing delays
            for attempt in range(1, 4):
                try:
                    # Update attempt info
                    try:
                        with open('scraper_progress.txt', 'w') as f:
                            f.write(f"{progress_msg} (attempt {attempt}/3)\n")
                            f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)")
                    except:
                        pass
                        
                    # Direct scrape, don't use batch method
                    result = scraper.scrape_profile(username)
                    
                    if result and result.get('follower_count') is not None:
                        all_results.append(result)
                        success_msg = f"✓ Successfully scraped {username}: {result.get('follower_count')} followers on attempt {attempt}"
                        logger.info(success_msg)
                        
                        # Update progress file with success
                        try:
                            with open('scraper_progress.txt', 'w') as f:
                                f.write(f"{success_msg}\n")
                                f.write(f"Completed: {i+1}/{total} ({int((i+1)/total*100 if total > 0 else 0)}%)")
                        except:
                            pass
                            
                        break
                    else:
                        warning_msg = f"Failed attempt {attempt} for {username}"
                        logger.warning(warning_msg)
                        
                        # Update progress file with failure
                        try:
                            with open('scraper_progress.txt', 'w') as f:
                                f.write(f"{warning_msg}\n")
                                f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)")
                        except:
                            pass
                            
                        if attempt < 3:
                            retry_delay = attempt * 2  # Increasing delay
                            retry_msg = f"Waiting {retry_delay}s before retry..."
                            logger.info(retry_msg)
                            
                            # Update progress with retry info
                            try:
                                with open('scraper_progress.txt', 'w') as f:
                                    f.write(f"{warning_msg} - {retry_msg}\n")
                                    f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)")
                            except:
                                pass
                                
                            time.sleep(retry_delay)
                except Exception as e:
                    error_msg = f"Error scraping {username} (attempt {attempt}): {str(e)}"
                    logger.error(error_msg)
                    
                    # Update progress file with error
                    try:
                        with open('scraper_progress.txt', 'w') as f:
                            f.write(f"{error_msg}\n")
                            f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)")
                    except:
                        pass
                        
                    if attempt < 3:
                        retry_delay = attempt * 2
                        retry_msg = f"Waiting {retry_delay}s before retry..."
                        logger.info(retry_msg)
                        
                        # Update progress with retry info
                        try:
                            with open('scraper_progress.txt', 'w') as f:
                                f.write(f"{error_msg} - {retry_msg}\n")
                                f.write(f"Completed: {i}/{total} ({int(i/total*100 if total > 0 else 0)}%)")
                        except:
                            pass
                            
                        time.sleep(retry_delay)
            
            # Add delay between accounts if needed
            if i < total - 1 and DELAY_SECONDS > 0:
                delay_msg = f"Waiting {DELAY_SECONDS} seconds before next account..."
                logger.info(delay_msg)
                
                # Update progress with delay info
                try:
                    with open('scraper_progress.txt', 'w') as f:
                        f.write(f"{delay_msg}\n")
                        f.write(f"Completed: {i+1}/{total} ({int((i+1)/total*100 if total > 0 else 0)}%)")
                except:
                    pass
                    
                time.sleep(DELAY_SECONDS)
        
        # Log summary
        successful = len(all_results)
        logger.info(f"Scraping complete: {successful}/{total} successful")
        
        # Return results even if it's just a partial success
        return all_results
    except Exception as e:
        logger.error(f"Error in scraping process: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def update_data_with_new_scrapes(new_results):
    """Update database and latest_data.json with new scraped results"""
    if not new_results:
        logger.error("No new results to save")
        return False
        
    try:
        # First try to save to database
        from db import is_db_available, get_db
        from repository import get_account_by_username, create_snapshot, create_account
        import time
        
        db_update_success = False
        if is_db_available():
            start_time = time.time()
            try:
                db = get_db()
                db_count = 0
                
                # Add a progress indicator for database updates
                update_progress = f"Saving {len(new_results)} profiles to database..."
                logger.info(update_progress)
                try:
                    with open('scraper_progress.txt', 'w') as f:
                        f.write(f"{update_progress}\n")
                except:
                    pass
                
                # For each result, save to database
                for profile in new_results:
                    username = profile.get('username')
                    follower_count = profile.get('follower_count')
                    bio = profile.get('bio', '')
                    profile_img_url = profile.get('profile_img_url', '')
                    
                    if username and follower_count is not None:
                        # Get or create account
                        account = get_account_by_username(db, username)
                        if not account:
                            account = create_account(db, username)
                            
                        # Create snapshot
                        snapshot = create_snapshot(
                            db=db,
                            account_id=account.id,
                            follower_count=follower_count,
                            bio=bio,
                            profile_img_url=profile_img_url
                        )
                        db_count += 1
                
                # Close DB session explicitly
                db.close()
                
                duration = time.time() - start_time
                logger.info(f"Successfully added {db_count} profiles to database in {duration:.2f} seconds")
                db_update_success = True
                
            except Exception as db_error:
                logger.error(f"Error updating database: {str(db_error)}")
                logger.info("Falling back to file-based storage...")
        
        # Always update the JSON file as well (backup or primary storage)
        # Load existing data
        existing_data = load_existing_data()
        
        # Get usernames from existing data
        existing_usernames = [profile['username'].lower() for profile in existing_data]
        
        # Merge data (replace existing entries for new accounts)
        merged_data = []
        for profile in existing_data:
            # Keep existing profile if not in new accounts
            if profile['username'].lower() not in [r['username'].lower() for r in new_results]:
                merged_data.append(profile)
            # Otherwise it will be replaced by the new data
        
        # Add all new results
        merged_data.extend(new_results)
        
        # Save merged data
        data_dir = "data"
        latest_json = os.path.join(data_dir, "latest_data.json")
        with open(latest_json, 'w') as f:
            json.dump(merged_data, f, indent=4)
            
        logger.info(f"Saved merged data with {len(merged_data)} profiles to latest_data.json")
        
        # Count successful scrapes
        successful = sum(1 for r in new_results if r.get('follower_count') is not None)
        storage_msg = "database and JSON file" if db_update_success else "JSON file (database update failed)"
        print(f"Scraping complete: {successful} successful, {len(new_results) - successful} failed")
        print(f"Results saved to {storage_msg}")
        
        # Update progress file with completion information
        try:
            with open('scraper_progress.txt', 'w') as f:
                f.write(f"Scraping and data storage complete. {successful} profiles updated.\n")
                f.write(f"Data saved to {storage_msg}")
        except:
            pass
            
        return True
    except Exception as e:
        logger.error(f"Error updating data: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def main():
    print("Instagram AI Leaderboard - Account Manager")
    print("=========================================")
    
    # Parse command line args
    import argparse
    parser = argparse.ArgumentParser(description='Instagram Account Scraper')
    parser.add_argument('--single', action='store_true', help='Scrape a random single account')
    parser.add_argument('--all', action='store_true', help='Scrape all accounts')
    parser.add_argument('--single-account', type=str, help='Scrape a specific account')
    parser.add_argument('--rate-limited', action='store_true', help='Use slower rate-limited mode')
    parser.add_argument('--log-file', type=str, help='Path to log file for status updates')
    args, unknown = parser.parse_known_args()
    
    # Setup custom logging if log file provided
    log_file = args.log_file
    if log_file:
        # Add file handler to existing logger
        try:
            file_handler = logging.FileHandler(log_file, mode='a')
            file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            logger.addHandler(file_handler)
            logger.info("Added log file handler for better status tracking")
        except Exception as e:
            logger.error(f"Error setting up log file: {str(e)}")
    
    # Check if we should use rate limiting
    rate_limited_mode = args.rate_limited
    
    # Specific account mode
    if args.single_account:
        username = args.single_account
        print(f"\nScraping specific account: {username}")
        results = scrape_accounts([username], rate_limited=False)
        if results:
            update_data_with_new_scrapes(results)
            print(f"Scraping for {username} completed.")
            return
        else:
            print(f"Failed to scrape {username}")
            return
    
    # Check for different modes
    elif args.single:
        print("\nRunning in single account mode...")
        all_accounts = load_existing_accounts()
        
        if all_accounts:
            # Just scrape one account to avoid API rate limits
            import random
            accounts_to_scrape = [random.choice(all_accounts)]
            print(f"Scraping {accounts_to_scrape[0]}...")
            results = scrape_accounts(accounts_to_scrape)
            if results:
                update_data_with_new_scrapes(results)
                return
        else:
            print("No accounts available to scrape")
        return
        
    elif args.all:
        print("\nRunning in full scrape mode...")
        all_accounts = load_existing_accounts()
        
        if all_accounts:
            print(f"Scraping all {len(all_accounts)} accounts with rate limiting...")
            results = scrape_accounts(all_accounts, rate_limited=True)
            if results:
                update_data_with_new_scrapes(results)
                return
        else:
            print("No accounts available to scrape")
        return
    
    # Regular mode - add new accounts
    added, skipped, all_accounts = add_new_accounts()
    
    print(f"\nAccounts summary:")
    print(f"- Added {len(added)} new accounts")
    print(f"- Skipped {len(skipped)} duplicate accounts")
    print(f"- Total accounts: {len(all_accounts)}")
    
    # Ask if we should scrape
    accounts_to_scrape = added
    
    if not accounts_to_scrape:
        accounts_to_scrape = all_accounts
        print("\nNo new accounts were added.")
        
    # Always scrape all new accounts we just added
    if added:
        print(f"\nScraping {len(added)} newly added accounts...")
        results = scrape_accounts(added, rate_limited=rate_limited_mode)
        if results:
            update_data_with_new_scrapes(results)
    else:
        print("\nNo new accounts to scrape.")

if __name__ == "__main__":
    main()