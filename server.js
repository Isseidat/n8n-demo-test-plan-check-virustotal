require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// ??? C?U HÌNH K?T N?I T? FILE .ENV (B?O M?T BI?N MÔI TRU?NG)
const PORT = process.env.PORT || 3000;
const N8N_HOST = process.env.N8N_HOST || 'http://localhost:5678';
const N8N_KEY = process.env.N8N_KEY;
const WORKFLOW_ID = process.env.WORKFLOW_ID;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:10001/soc_logs';

// ?? K?T N?I MONGODB LOCAL
mongoose.connect(MONGO_URI)
  .then(() => console.log('[MongoDB] Da ket noi thanh cong toi Database soc_logs!'))
  .catch(err => console.error('[MongoDB Error] Loi ket noi MongoDB:', err.message));

// Schema khuon mau luu lich su quet Hash
const scanLogSchema = new mongoose.Schema({
  file_hash: String,
  status: String,
  scanned_at: { type: Date, default: Date.now }
});
const ScanLog = mongoose.model('ScanLog', scanLogSchema);

// 1. API doc config workflow
app.get('/api/n8n/get-config', async (req, res) => {
    try {
        const response = await axios.get(${N8N_HOST}/api/v1/workflows/, {
            headers: { 'X-N8N-API-KEY': N8N_KEY }
        });

        console.log('[BE] Doc config workflow n8n thanh cong');
        res.json(response.data);
    } catch (error) {
        console.error('[BE Error] Loi khi lay config workflow:', error.message);
        res.status(500).json({ error: 'Loi khi lay config workflow', detail: error.message });
    }
});

// 2. API quet hash + TU DONG LUU LICHSU VAO MONGODB
app.post('/api/n8n/scan-hash', async (req, res) => {
    try {
        const { hash } = req.body;
        const n8nWebhookURL = N8N_WEBHOOK_URL || ${N8N_HOST}/webhook/a115fb35-380c-4777-8bf3-81f268e638e9;

        console.log([BE] Dang gui hash  sang n8n webhook);

        // G?i n8n x? lý
        const scanResponse = await axios.post(n8nWebhookURL, {
            file_hash_sha256: hash
        });

        // ?? T? Ð?NG LUU DÒNG NH?T KÝ S? C? VÀO MONGODB
        const newLog = new ScanLog({
            file_hash: hash,
            status: 'SENT_TO_SOAR_N8N'
        });
        await newLog.save();
        console.log([MongoDB] Da luu vet hash  vao database!);

        res.json({
            message: 'Gui hash sang n8n va luu vao MongoDB thanh cong',
            data: scanResponse.data,
            db_log: newLog
        });
    } catch (error) {
        console.error('[BE Error] Loi khi quet hash sang n8n:', error.message);
        res.status(500).json({ error: 'Loi khi quet hash sang n8n', detail: error.message });
    }
});

// 3. API XEM L?CH S? CÁC L?N QUÉT TRONG MONGODB
app.get('/api/history-logs', async (req, res) => {
    try {
        const logs = await ScanLog.find().sort({ scanned_at: -1 });
        res.json({
            total_scans: logs.length,
            logs: logs
        });
    } catch (error) {
        res.status(500).json({ error: 'Loi khi doc lich su MongoDB', detail: error.message });
    }
});

app.listen(PORT, () => {
    console.log(Server Backend dang chay tai http://localhost:);
    console.log(GET  http://localhost:/api/n8n/get-config (Doc cau hinh Workflow));
    console.log(POST http://localhost:/api/n8n/scan-hash (Quet & Luu MongoDB));
    console.log(GET  http://localhost:/api/history-logs (Xem lich su MongoDB));
});
