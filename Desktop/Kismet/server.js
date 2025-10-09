const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Railway volume mount path
const VOLUME_PATH = '/app';
const SOURCE_PATH = __dirname;

// Copy files from source to volume on startup
function copyFilesToVolume() {
  console.log('Starting file copy to volume...');
  
  try {
    // Ensure volume directory exists
    if (!fs.existsSync(VOLUME_PATH)) {
      console.log('Volume path does not exist, creating...');
      fs.mkdirSync(VOLUME_PATH, { recursive: true });
    }

    // Copy all files from source to volume
    const { execSync } = require('child_process');
    execSync(`cp -r ${SOURCE_PATH}/* ${VOLUME_PATH}/`, { stdio: 'inherit' });
    
    console.log('Files successfully copied to volume');
    return true;
  } catch (error) {
    console.error('Error copying files to volume:', error);
    return false;
  }
}

// Check if volume is ready and populated
function checkVolumeReady() {
  try {
    const indexPath = path.join(VOLUME_PATH, 'index.html');
    return fs.existsSync(indexPath);
  } catch (error) {
    console.error('Error checking volume readiness:', error);
    return false;
  }
}

// Initialize server
async function startServer() {
  console.log('Initializing Railway volume deployment...');
  
  // Copy files to volume
  const copySuccess = copyFilesToVolume();
  if (!copySuccess) {
    console.error('Failed to copy files to volume, exiting...');
    process.exit(1);
  }

  // Verify volume is ready
  if (!checkVolumeReady()) {
    console.error('Volume not ready after file copy, exiting...');
    process.exit(1);
  }

  // Serve static files from volume
  app.use(express.static(VOLUME_PATH));

  // Handle SPA routing - serve index.html from volume
  app.get('*', (req, res) => {
    res.sendFile(path.join(VOLUME_PATH, 'index.html'));
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      volumeReady: checkVolumeReady(),
      timestamp: new Date().toISOString()
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Serving files from volume: ${VOLUME_PATH}`);
    console.log(`Health check available at /health`);
  });
}

// Start the server
startServer();