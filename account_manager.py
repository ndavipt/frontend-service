"""
Account Manager Module 

This module handles the management of Instagram accounts:
- Loading and saving account data
- Submitting new accounts
- Approving/rejecting pending accounts
"""

import os
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("account_manager.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('account_manager')

class AccountManager:
    """Manages the Instagram accounts being tracked"""
    
    def __init__(self):
        """Initialize the account manager"""
        self.accounts_file = 'accounts.json'
        self.pending_file = 'pending_accounts.json'
        
        # Create files if they don't exist
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        """Ensure the accounts and pending_accounts files exist"""
        if not os.path.exists(self.accounts_file):
            logger.info(f"Creating new accounts file: {self.accounts_file}")
            self._save_accounts({'accounts': []})
        
        if not os.path.exists(self.pending_file):
            logger.info(f"Creating new pending accounts file: {self.pending_file}")
            self._save_pending({'pending_accounts': []})
    
    def _load_accounts(self):
        """Load the accounts data from file"""
        try:
            with open(self.accounts_file, 'r') as f:
                data = json.load(f)
                logger.info(f"Loaded {len(data.get('accounts', []))} accounts from {self.accounts_file}")
                return data
        except Exception as e:
            logger.error(f"Error loading accounts: {str(e)}")
            return {'accounts': []}
    
    def _load_pending(self):
        """Load the pending accounts data from file"""
        try:
            with open(self.pending_file, 'r') as f:
                data = json.load(f)
                logger.info(f"Loaded {len(data.get('pending_accounts', []))} pending accounts from {self.pending_file}")
                return data
        except Exception as e:
            logger.error(f"Error loading pending accounts: {str(e)}")
            return {'pending_accounts': []}
    
    def _save_accounts(self, data):
        """Save the accounts data to file"""
        try:
            with open(self.accounts_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(data.get('accounts', []))} accounts to {self.accounts_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving accounts: {str(e)}")
            return False
    
    def _save_pending(self, data):
        """Save the pending accounts data to file"""
        try:
            with open(self.pending_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(data.get('pending_accounts', []))} pending accounts to {self.pending_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving pending accounts: {str(e)}")
            return False
    
    def get_accounts(self):
        """Get all tracked accounts"""
        data = self._load_accounts()
        return data.get('accounts', [])
    
    def get_pending_accounts(self):
        """Get all pending accounts"""
        data = self._load_pending()
        return data.get('pending_accounts', [])
    
    def submit_account(self, username, submitter='Anonymous'):
        """Submit a new account for consideration"""
        if not username:
            return False, "Username is required"
        
        # Normalize username (remove @ prefix if present)
        if username.startswith('@'):
            username = username[1:]
        
        # Check if account is already being tracked
        accounts = self.get_accounts()
        for account in accounts:
            if account.get('username').lower() == username.lower():
                return False, f"Account @{username} is already being tracked"
        
        # Check if account is already pending
        pending = self.get_pending_accounts()
        for account in pending:
            if account.get('username').lower() == username.lower():
                return False, f"Account @{username} is already pending approval"
        
        # Add to pending accounts
        pending_data = self._load_pending()
        pending_accounts = pending_data.get('pending_accounts', [])
        
        pending_accounts.append({
            'username': username,
            'submitter': submitter,
            'submitted_at': datetime.now().isoformat()
        })
        
        pending_data['pending_accounts'] = pending_accounts
        
        # Save pending accounts
        if self._save_pending(pending_data):
            return True, f"Account @{username} has been submitted for review"
        else:
            return False, "Error saving pending account"
    
    def approve_account(self, username):
        """Approve a pending account and add it to tracked accounts"""
        # Get pending accounts
        pending_data = self._load_pending()
        pending_accounts = pending_data.get('pending_accounts', [])
        
        # Find the account in pending accounts
        found = False
        account_to_approve = None
        for i, account in enumerate(pending_accounts):
            if account.get('username').lower() == username.lower():
                account_to_approve = account
                del pending_accounts[i]
                found = True
                break
        
        if not found:
            return False, f"Account @{username} is not in the pending list"
        
        # Update pending accounts
        pending_data['pending_accounts'] = pending_accounts
        if not self._save_pending(pending_data):
            return False, "Error saving pending accounts"
        
        # Add to tracked accounts
        accounts_data = self._load_accounts()
        accounts = accounts_data.get('accounts', [])
        
        accounts.append({
            'username': account_to_approve.get('username'),
            'submitter': account_to_approve.get('submitter', 'Anonymous'),
            'approved_at': datetime.now().isoformat()
        })
        
        accounts_data['accounts'] = accounts
        
        # Save tracked accounts
        if self._save_accounts(accounts_data):
            return True, f"Account @{username} has been approved"
        else:
            return False, "Error saving approved account"
    
    def reject_account(self, username):
        """Reject a pending account"""
        # Get pending accounts
        pending_data = self._load_pending()
        pending_accounts = pending_data.get('pending_accounts', [])
        
        # Find the account in pending accounts
        found = False
        for i, account in enumerate(pending_accounts):
            if account.get('username').lower() == username.lower():
                del pending_accounts[i]
                found = True
                break
        
        if not found:
            return False, f"Account @{username} is not in the pending list"
        
        # Update pending accounts
        pending_data['pending_accounts'] = pending_accounts
        if self._save_pending(pending_data):
            return True, f"Account @{username} has been rejected"
        else:
            return False, "Error saving pending accounts"
            
    def remove_account(self, username):
        """Remove an account from the tracked accounts list"""
        # Get accounts
        accounts_data = self._load_accounts()
        accounts = accounts_data.get('accounts', [])
        
        # Find the account in accounts
        found = False
        for i, account in enumerate(accounts):
            if account.get('username').lower() == username.lower():
                del accounts[i]
                found = True
                break
        
        if not found:
            return False, f"Account @{username} is not in the tracked accounts list"
        
        # Update accounts
        accounts_data['accounts'] = accounts
        if self._save_accounts(accounts_data):
            return True, f"Account @{username} has been removed from tracking"
        else:
            return False, "Error saving accounts"
            
    def get_tracked_accounts(self):
        """Get all tracked accounts with additional metadata"""
        accounts = self.get_accounts()
        
        # Add additional metadata
        for account in accounts:
            if 'approved_at' in account:
                account['added'] = account['approved_at']
            else:
                account['added'] = 'Unknown'
        
        return accounts