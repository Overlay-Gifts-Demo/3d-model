const express = require('express');
const app = express();

// Serve all files in the folder
app.use(express.static(__dirname));

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Server running on port 3000');
});