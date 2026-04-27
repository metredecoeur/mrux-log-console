const express = require('express');
const path = require('path');
const app = express();
const port = 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Store logs in memory
let logs = [];

// Serve the static HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Receive logs from Unity
app.post('/log', (req, res) => {
    const data = req.body;
    if (data && data.message) {
        logs.push(data.message);
        console.log(`Log received: ${data.message}`);
        return res.status(200).json({ status: "success" });
    }
    return res.status(400).json({ status: "error", message: "No data received" });
});

// Send logs to the frontend
app.get('/get_logs', (req, res) => {
    res.json(logs);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
});