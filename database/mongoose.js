// database/mongoose.js
const mongoose = require('mongoose');

let isConnected = false;

async function connectMongo({ uri, dbName }) {
    if (isConnected) return mongoose.connection;

    // แนะนำให้ส่งค่าเข้ามาจาก config
    const mongoUri = uri || process.env.MONGODB_URI;
    const mongoDbName = dbName || process.env.MONGODB_DBNAME;

    if (!mongoUri) throw new Error('MONGODB_URI is not set');

    // Mongoose 8 ขึ้นไป ไม่ต้องใส่ useNewUrlParser/useUnifiedTopology
    await mongoose.connect(mongoUri, {
        dbName: mongoDbName,
        // ตัวเลือกเสริม:
        autoIndex: true,         // ปิดเป็น false ถ้า production ใหญ่
        serverSelectionTimeoutMS: 10000,
        // family: 4,            // force IPv4 ถ้าเครื่องมีปัญหา IPv6
    });

    isConnected = true;

    const conn = mongoose.connection;

    conn.on('connected', () => console.log('✅ MongoDB connected'));
    conn.on('error', (err) => console.error('❌ MongoDB error:', err));
    conn.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));

    // ปิดอย่างนุ่มนวลตอน process ถูก kill
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🛑 MongoDB connection closed (SIGINT)');
        process.exit(0);
    });

    return conn;
}

module.exports = { connectMongo };
