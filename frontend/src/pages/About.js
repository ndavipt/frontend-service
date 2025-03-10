import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import InstagramIcon from '@mui/icons-material/Instagram';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import CodeIcon from '@mui/icons-material/Code';
import SecurityIcon from '@mui/icons-material/Security';
import UpdateIcon from '@mui/icons-material/Update';
import PeopleIcon from '@mui/icons-material/People';

const About = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 3 }}>
        About This Project
      </Typography>
      
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
          What is the Instagram AI Leaderboard?
        </Typography>
        
        <Typography variant="body1" paragraph>
          The Instagram AI Leaderboard is a project that tracks and ranks Instagram accounts of AI-generated personalities based on their follower counts. As AI-generated content creators become increasingly popular on Instagram, this leaderboard provides insights into their growth and popularity.
        </Typography>
        
        <Typography variant="body1" paragraph>
          Our goal is to provide a transparent and up-to-date ranking of these accounts, while respecting Instagram's terms of service and only using publicly available data.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Key Features
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <InstagramIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Instagram Profile Tracking" 
              secondary="We track AI-generated Instagram accounts and their public follower counts"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <QueryStatsIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Growth Analysis" 
              secondary="View historical follower growth trends and compare account performance"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <UpdateIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Regular Updates" 
              secondary="Data is refreshed regularly to provide current rankings"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <PeopleIcon color="primary" />
            </ListItemIcon>
            <ListItemText 
              primary="Community Submissions" 
              secondary="Users can submit new AI Instagram accounts for review and inclusion"
            />
          </ListItem>
        </List>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Technical Implementation
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" paragraph>
                This project is built using modern web technologies:
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Backend: Python with Flask" 
                    secondary="REST API for data retrieval and submissions"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Frontend: React with Material UI" 
                    secondary="Responsive design for all devices"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Data Collection: Selenium & BeautifulSoup" 
                    secondary="Web scraping tools for public profile data"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Data & Privacy
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body2" paragraph>
                We take data privacy and compliance seriously:
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Public Data Only" 
                    secondary="We only collect publicly available information from Instagram profiles"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Ethical Web Scraping" 
                    secondary="Our scraping practices respect rate limits and Instagram's terms of service"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Transparency" 
                    secondary="We clearly communicate data sources and update frequencies"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default About;