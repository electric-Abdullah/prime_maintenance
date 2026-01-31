const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration (from environment variables)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

// Serve static files
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Contact form endpoint (for future email integration)
app.post('/api/contact', (req, res) => {
    const { name, email, phone, service, message } = req.body;
    
    // Log the form submission
    console.log('Contact Form Submission:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Service:', service);
    console.log('Message:', message);
    
    // TODO: Integrate with email service (SendGrid, Nodemailer, etc.)
    // For now, just send success response
    res.json({ 
        success: true, 
        message: 'Thank you for your message! We will get back to you soon.' 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Prime Maintenance website is running' });
});

// ============================================
// Supabase Proxy Endpoints (for security)
// ============================================

// Proxy endpoint to get configuration (without exposing API key)
app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: SUPABASE_URL,
        googleSheetId: GOOGLE_SHEET_ID
    });
});

// Proxy endpoint for Supabase requests
app.post('/api/supabase', async (req, res) => {
    try {
        const { table, method, query, data } = req.body;
        
        console.log(`📊 Supabase Request: ${method} ${table}`);
        
        if (!table) {
            return res.status(400).json({ error: 'Table name required' });
        }

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            console.error('❌ Missing Supabase credentials');
            return res.status(500).json({ error: 'Server not configured' });
        }

        let url = `${SUPABASE_URL}/rest/v1/${table}`;
        let options = {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        // Add query parameters if provided
        if (query) {
            const queryString = new URLSearchParams(query).toString();
            url += `?${queryString}`;
        }

        // Handle different HTTP methods
        switch (method) {
            case 'GET':
                options.method = 'GET';
                break;
            case 'POST':
                options.method = 'POST';
                options.body = JSON.stringify(data);
                break;
            case 'PATCH':
                options.method = 'PATCH';
                options.body = JSON.stringify(data);
                break;
            case 'DELETE':
                options.method = 'DELETE';
                break;
            default:
                return res.status(400).json({ error: 'Invalid method' });
        }

        console.log(`🔗 Calling: ${method} ${url.split('?')[0]}`);

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            console.error(`❌ Supabase error (${response.status}):`, responseData);
            return res.status(response.status).json(responseData);
        }

        console.log(`✅ Supabase success (${response.status})`);
        res.json(responseData);
    } catch (error) {
        console.error('❌ Supabase proxy error:', error.message);
        res.status(500).json({ error: error.message || 'Supabase request failed' });
    }
});

// Google Sheets API proxy
app.get('/api/google-sheets', async (req, res) => {
    try {
        const { sheet } = req.query;
        const apiUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheet || 'Sheet1'}`;
        
        const response = await fetch(apiUrl);
        const text = await response.text();
        
        // Google Visualization API returns JSONP, extract JSON
        const jsonMatch = text.match(/\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\((.*)\);/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            return res.json(jsonData);
        }
        
        res.status(500).json({ error: 'Failed to parse Google Sheets response' });
    } catch (error) {
        console.error('Google Sheets proxy error:', error);
        res.status(500).json({ error: 'Google Sheets request failed' });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Prime Maintenance website is running on port ${PORT}`);
    console.log(`📧 Contact: technician.abdullah.beg@gmail.com`);
    console.log(`📱 Phone: 0311-1041491`);
});