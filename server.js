require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
app.use(express.json());

// 📜 TÍCH HỢP GIAO DIỆN SWAGGER UI DỰ ÁN
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/', (req, res) => {
    // #swagger.ignore = true
    res.redirect('/api-docs');
});

// 🗝️ CẤU HÌNH KẾT NỐI TỪ FILE .ENV (BẢO MẬT BIẾN MÔI TRƯỜNG)
const PORT = process.env.PORT || 3000;
const N8N_HOST = process.env.N8N_HOST || 'http://localhost:5678';
const N8N_KEY = process.env.N8N_KEY;
const WORKFLOW_ID = process.env.WORKFLOW_ID;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:10001/soc_logs';

// 🍃 KẾT NỐI MONGODB LOCAL
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
    // #swagger.summary = 'Đọc cấu hình Workflow từ n8n'
    // #swagger.description = 'Lấy thông tin thiết lập và danh sách các node hiện tại của n8n Workflow'
    try {
        const response = await axios.get(`${N8N_HOST}/api/v1/workflows/${WORKFLOW_ID}`, {
            headers: { 'X-N8N-API-KEY': N8N_KEY }
        });

        console.log("[BE] Doc config workflow n8n thanh cong");
        res.json(response.data);
    } catch (error) {
        console.error('[BE Error] Loi khi lay config workflow:', error.message);
        res.status(500).json({ error: 'Loi khi lay config workflow', detail: error.message });
    }
});

// 2. API quet hash + TU DONG LUU LICHSU VAO MONGODB
app.post('/api/n8n/scan-hash', async (req, res) => {
    // #swagger.summary = 'Gửi mã Hash SHA256 để quét virus và lưu log'
    // #swagger.description = 'Truyền mã SHA256 sang n8n Webhook để phân tích VirusTotal và tự động ghi nhật ký vào MongoDB'
    try {
        const { hash } = req.body;
        const n8nWebhookURL = N8N_WEBHOOK_URL || `${N8N_HOST}/webhook/a115fb35-380c-4777-8bf3-81f268e638e9`;

        console.log(`[BE] Dang gui hash ${hash} sang n8n webhook`);

        // Gửi n8n xử lý
        const scanResponse = await axios.post(n8nWebhookURL, {
            file_hash_sha256: hash
        });

        // 🍃 TỰ ĐỘNG LƯU DÒNG NHẬT KÝ SỰ CỐ VÀO MONGODB
        const newLog = new ScanLog({
            file_hash: hash,
            status: 'SENT_TO_SOAR_N8N'
        });
        await newLog.save();
        console.log(`[MongoDB] Da luu vet hash ${hash} vao database!`);

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

// 3. API XEM LỊCH SỬ CÁC LẦN QUÉT TRONG MONGODB
app.get('/api/history-logs', async (req, res) => {
    // #swagger.summary = 'Xem lịch sử các lần quét mã Hash trong MongoDB'
    // #swagger.description = 'Lấy danh sách toàn bộ các nhật ký sự cố đã từng quét được lưu trong CSDL MongoDB'
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
    console.log(`Server Backend dang chay tai http://localhost:${PORT}`);
    console.log(`Giao dien Swagger UI tai: http://localhost:${PORT}/api-docs`);
    console.log(`GET  http://localhost:${PORT}/api/n8n/get-config (Doc cau hinh Workflow)`);
    console.log(`POST http://localhost:${PORT}/api/n8n/scan-hash (Quet & Luu MongoDB)`);
    console.log(`GET  http://localhost:${PORT}/api/history-logs (Xem lich su MongoDB)`);
});


