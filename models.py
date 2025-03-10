"""
Database models for the Instagram AI Leaderboard application.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, BigInteger, Float, LargeBinary, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from db import Base

class Account(Base):
    """Instagram account being tracked"""
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    snapshots = relationship("Snapshot", back_populates="account")

class Snapshot(Base):
    """Point-in-time snapshot of account data"""
    __tablename__ = "snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    follower_count = Column(Integer)
    # Note: follower_change is computed during API response, not stored in DB
    bio = Column(Text)
    profile_img_url = Column(String(255))
    scraped_at = Column(DateTime)
    
    # Relationships
    account = relationship("Account", back_populates="snapshots")

class ScrapeStats(Base):
    """Statistics from each scraping run"""
    __tablename__ = "scrape_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime)
    duration_seconds = Column(Float)
    accounts_total = Column(Integer)
    accounts_successful = Column(Integer)
    total_followers = Column(BigInteger)
    method = Column(String(50))

class PendingAccount(Base):
    """Accounts submitted by users pending approval"""
    __tablename__ = "pending_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    submitter = Column(String(100))
    submitted_at = Column(DateTime, default=datetime.now)

class ProfileImage(Base):
    """Store profile images in the database"""
    __tablename__ = "profile_images"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # The MD5 hash of the source URL for identification and deduplication
    url_hash = Column(String(32), index=True, unique=True)
    
    # Original URL for reference
    source_url = Column(String(255))
    
    # The binary image data
    image_data = Column(LargeBinary)
    
    # Image content type (e.g., image/jpeg)
    content_type = Column(String(50), default="image/jpeg")
    
    # Metadata
    username = Column(String(50), index=True)
    cached_at = Column(DateTime, default=datetime.now)
    last_accessed = Column(DateTime, default=datetime.now)
    
    # Create a unique constraint on the hash to prevent duplicates
    __table_args__ = (UniqueConstraint('url_hash', name='uix_url_hash'),)