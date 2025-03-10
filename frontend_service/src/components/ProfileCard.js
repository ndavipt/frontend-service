import React from 'react';
import { Card } from 'react-bootstrap';
import { API_CONFIG } from '../config';

function ProfileCard({ profile, rank }) {
  const { username, followers, follower_change, profile_pic_url, bio } = profile;
  
  // Format follower count with commas
  const formattedFollowers = followers.toLocaleString();
  
  // Determine the change class and prefix
  const changeClass = follower_change > 0 ? 'positive' : follower_change < 0 ? 'negative' : 'neutral';
  const changePrefix = follower_change > 0 ? '+' : '';
  
  // Format the follower change
  const formattedChange = `${changePrefix}${follower_change.toLocaleString()}`;
  
  // Get the profile image URL 
  // First check if it's a full URL, otherwise construct it
  const imgUrl = profile_pic_url?.startsWith('http') 
    ? profile_pic_url 
    : `${API_CONFIG.MAIN_API}/img/profile/${username}`;
  
  return (
    <Card className="profile-card h-100">
      <Card.Body className="text-center">
        <div className="mb-2 text-muted">#{rank}</div>
        <img 
          src={imgUrl} 
          alt={`${username} profile`} 
          className="profile-image"
          onError={(e) => {
            // If image fails to load, use a placeholder
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/100?text=AI';
          }}
        />
        <Card.Title className="profile-username">@{username}</Card.Title>
        <div className="profile-followers">{formattedFollowers} followers</div>
        <div className={`follower-change ${changeClass}`}>
          {formattedChange}
        </div>
        {bio && <Card.Text className="mt-3 small text-muted">{bio}</Card.Text>}
      </Card.Body>
    </Card>
  );
}

export default ProfileCard;