import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { APP_CONFIG } from '../config';

function Layout() {
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/">{APP_CONFIG.APP_NAME}</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Leaderboard</Nav.Link>
              <Nav.Link as={Link} to="/trends">Trends</Nav.Link>
              <Nav.Link as={Link} to="/submit">Submit Account</Nav.Link>
              <Nav.Link as={Link} to="/about">About</Nav.Link>
              <Nav.Link as={Link} to="/api-test">API Test</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="main-container">
        <Outlet />
      </Container>
      <footer className="bg-light text-center text-muted py-4 mt-5">
        <Container>
          <p className="mb-0">
            {APP_CONFIG.APP_NAME} &copy; {new Date().getFullYear()} | Version {APP_CONFIG.APP_VERSION}
          </p>
          <p className="small mb-0">
            Contact: {APP_CONFIG.CONTACT_EMAIL}
          </p>
        </Container>
      </footer>
    </>
  );
}

export default Layout;