import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import localtunnel from 'localtunnel';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// =======================================================================
// 1. 🚀 SERVER CONFIGURATION
// =======================================================================
const app = express();
const PORT = process.env.PORT || 3001; 
const DIST_PATH = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// --- SECURITY & CORS ---
app.set('trust proxy', 1);
app.use(helmet({ 
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false 
}));

const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'] 
    : '*';

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '50mb' })); 

// --- DATA HELPERS ---
const readJson = (file, defaultData = []) => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } 
    catch (e) { return defaultData; }
};
const writeJson = (file, data) => {
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, file);
};

// --- API ROUTES ---
const PARTS_FILE = path.join(DATA_DIR, 'parts.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const LOGO_FILE = path.join(DATA_DIR, 'logo.json');

const checkApiKey = (req, res, next) => {
    const serverKey = process.env.API_KEY || 'MOLEX_SECURE_ACCESS_2025';
    const clientKey = req.headers['x-api-key'];
    if (IS_PRODUCTION && clientKey !== serverKey) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    next();
};

app.get('/api/health', (req, res) => res.send('System Online'));

app.get('/api/users', checkApiKey, (req, res) => res.json(readJson(USERS_FILE, [])));
app.post('/api/users', checkApiKey, (req, res) => {
    const users = readJson(USERS_FILE, []);
    users.push(req.body);
    writeJson(USERS_FILE, users);
    res.json({ success: true });
});
app.delete('/api/users/:id', checkApiKey, (req, res) => {
    writeJson(USERS_FILE, readJson(USERS_FILE, []).filter(u => u.id !== req.params.id));
    res.json({ success: true });
});
app.get('/api/parts', checkApiKey, (req, res) => res.json(readJson(PARTS_FILE)));
app.post('/api/parts', checkApiKey, (req, res) => {
    const parts = readJson(PARTS_FILE);
    parts.push(req.body);
    writeJson(PARTS_FILE, parts);
    res.json({ success: true });
});
app.put('/api/parts/:id', checkApiKey, (req, res) => {
    const parts = readJson(PARTS_FILE);
    const idx = parts.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
        parts[idx] = { ...parts[idx], ...req.body };
        writeJson(PARTS_FILE, parts);
    }
    res.json({ success: true, data: idx !== -1 ? parts[idx] : null });
});
app.delete('/api/parts/:id', checkApiKey, (req, res) => {
    writeJson(PARTS_FILE, readJson(PARTS_FILE).filter(p => p.id !== req.params.id));
    res.json({ success: true });
});
app.post('/api/parts/:id/take', checkApiKey, (req, res) => {
    const parts = readJson(PARTS_FILE);
    const idx = parts.findIndex(p => p.id === req.params.id);
    if (idx !== -1 && parts[idx].quantity > 0) {
        parts[idx].quantity -= 1;
        writeJson(PARTS_FILE, parts);
        res.json({ success: true, data: parts[idx] });
    } else res.json({ success: false, message: 'Out of Stock' });
});
app.post('/api/parts/:id/restock', checkApiKey, (req, res) => {
    const parts = readJson(PARTS_FILE);
    const idx = parts.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
        parts[idx].quantity += req.body.quantity;
        writeJson(PARTS_FILE, parts);
        res.json({ success: true, data: parts[idx] });
    } else res.status(404).json({success: false});
});
app.post('/api/stock/reset', checkApiKey, (req, res) => {
    writeJson(PARTS_FILE, readJson(PARTS_FILE).map(p => ({...p, quantity: req.body.quantity})));
    res.json({ success: true });
});
app.get('/api/logs', checkApiKey, (req, res) => res.json(readJson(LOGS_FILE)));
app.post('/api/logs', checkApiKey, (req, res) => {
    const logs = readJson(LOGS_FILE);
    writeJson(LOGS_FILE, [req.body, ...logs].slice(0, 5000));
    res.json({ success: true });
});
app.get('/api/branding', checkApiKey, (req, res) => res.json(readJson(LOGO_FILE, { logo: null }).logo));
app.post('/api/branding', checkApiKey, (req, res) => { writeJson(LOGO_FILE, { logo: req.body.logo }); res.json({ success: true }); });
app.get('/api/settings', checkApiKey, (req, res) => res.json(readJson(SETTINGS_FILE, {})));
app.post('/api/settings', checkApiKey, (req, res) => { writeJson(SETTINGS_FILE, req.body); res.json({ success: true }); });

// Serve static files from the build folder if it exists
if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(DIST_PATH, 'index.html'));
        }
    });
}

const startTunnel = async () => {
    if (IS_PRODUCTION) return;
    try {
        const tunnel = await localtunnel({ port: PORT, subdomain: 'molex-inv-sys-' + Math.floor(Math.random() * 1000) });
        console.log(`\n✅ SYSTEM ONLINE: ${tunnel.url}`);
    } catch (error) {
        console.log("❌ Tunnel Error. Retrying...", error.message);
    }
};

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Engine Started on Port ${PORT}`);
    if (!IS_PRODUCTION) startTunnel();
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please stop other processes.`);
    } else {
        console.error(err);
    }
});