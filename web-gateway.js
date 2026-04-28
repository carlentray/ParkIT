const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// 1. Setup gRPC Client
const packageDefinition = protoLoader.loadSync('parkit.proto', { keepCase: true });
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;
const inventoryClient = new parkitProto.InventoryService('localhost:5002', grpc.credentials.createInsecure());
const gateClient = new parkitProto.GateService('localhost:5001', grpc.credentials.createInsecure());

// 2. Setup Express & WebSocket
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public')); // Tempat menyimpan file HTML nanti

// 3. Menghubungkan gRPC Stream ke WebSocket (Fitur Wajib 1)
const stream = inventoryClient.MonitorStatus({});
stream.on('data', (data) => {
    console.log('Data dari gRPC:', data);
    
    // Kirim data ke semua browser yang terhubung
    io.emit('update-dashboard', data);

    // Fitur Wajib 3: Server-Initiated Alert
    if (data.sisa_slot === 0) {
        io.emit('system-alert', '⚠️ PERINGATAN: Kapasitas Parkir Penuh!');
    }
});

// 4. Command & Control Bridge (Fitur Wajib 4)
io.on('connection', (socket) => {
    console.log('Browser terhubung');

    // 1. INITIAL FETCH (Cara Aman)
    const initialStream = inventoryClient.MonitorStatus({});
    
    initialStream.on('data', (data) => {
        socket.emit('update-dashboard', data);
        // Kita stop stream-nya setelah dapet 1 data
        initialStream.cancel(); 
    });

    // Tambahkan ini biar kalau di-cancel (Error Code 1) dia nggak crash
    initialStream.on('error', (err) => {
        if (err.code === 1) {
            console.log("[INFO] Initial stream closed normally.");
        } else {
            console.error("[ERROR] Initial stream error:", err);
        }
    });

    // 2. COMMAND & CONTROL: Simulasi Masuk Manual
    socket.on('trigger-entry-manual', (plat) => {
        const platRegex = /^[A-Z]{1,2}\s\d{1,4}\s[A-Z]{1,3}$/;
        
        if (!platRegex.test(plat)) {
            return socket.emit('error-msg', "Format plat nomor tidak valid");
        }

        gateClient.RecordEntry({ plat_nomor: plat }, (err, response) => {
            if (err) socket.emit('error-msg', err.details);
            else socket.emit('entry-success', response);
        });
    });

    // 3. COMMAND & CONTROL: Simulasi Keluar Manual
    socket.on('trigger-exit-manual', (data) => {
        gateClient.ProcessExit(data, (err, response) => {
            if (err) socket.emit('error-msg', err.details);
            else socket.emit('exit-success', response);
        });
    });

    socket.on('disconnect', () => {
        console.log('Browser terputus');
    });
});

server.listen(3000, () => {
    console.log('WEB GATEWAY running on http://localhost:3000');
});