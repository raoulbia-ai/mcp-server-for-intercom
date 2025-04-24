#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const port = process.env.PORT || 8080;

console.log('Starting Glama discovery server...');

// Directly serve the glama.json file
const wellKnownPath = path.join(process.cwd(), '.well-known');
console.log(`Well-known path: ${wellKnownPath}`);

const glamaJsonPath = path.join(wellKnownPath, 'glama.json');
console.log(`Glama JSON path: ${glamaJsonPath}`);
console.log(`File exists: ${fs.existsSync(glamaJsonPath)}`);

if (fs.existsSync(glamaJsonPath)) {
  const fileContent = fs.readFileSync(glamaJsonPath, 'utf8');
  console.log(`File content: ${fileContent}`);
}

// Directly serve the glama.json file
app.get('/.well-known/glama.json', (req, res) => {
  if (fs.existsSync(glamaJsonPath)) {
    const content = fs.readFileSync(glamaJsonPath, 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } else {
    res.status(404).send('glama.json not found');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  const files = fs.readdirSync(process.cwd());
  const wellKnownExists = fs.existsSync(wellKnownPath);
  const wellKnownFiles = wellKnownExists ? fs.readdirSync(wellKnownPath) : [];
  
  res.json({
    cwd: process.cwd(),
    files,
    wellKnownPath,
    wellKnownExists,
    wellKnownFiles,
    glamaJsonPath,
    glamaJsonExists: fs.existsSync(glamaJsonPath)
  });
});

// Start HTTP server
app.listen(port, '0.0.0.0', () => {
  console.log(`Glama discovery HTTP server running on port ${port}`);
});