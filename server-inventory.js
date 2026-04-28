const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;

let available_slots = 5;
let ticket_counter = 1;
let active_tickets = {}; 
let dashboardStreams = []; 

function broadcastUpdate(logMsg) {
    dashboardStreams.forEach(stream => {
        stream.write({ 
            sisa_slot: available_slots, 
            log_terakhir: logMsg,
            data_kendaraan: JSON.stringify(active_tickets) 
        });
    });
}

const server = new grpc.Server();
server.addService(parkitProto.InventoryService.service, {
    ReserveSlot: (call, callback) => {
        if (available_slots <= 0) {
            return callback({ code: grpc.status.RESOURCE_EXHAUSTED, details: "Parkir Penuh!" });
        }
        available_slots -= 1;
        let ticketId = "TIX-" + ticket_counter++;
        active_tickets[ticketId] = call.request.plat_nomor;
        
        broadcastUpdate(`Masuk: ${call.request.plat_nomor} (Tiket: ${ticketId})`);
        callback(null, { ticket_id: ticketId, status: "Akses Diberikan" });
    },
    VerifyTicket: (call, callback) => {
        if (!active_tickets[call.request.ticket_id]) {
            return callback({ code: grpc.status.NOT_FOUND, details: "ID Tiket tidak valid atau mobil sudah keluar!" });
        }
        callback(null, { status: "OK" });
    },

    FreeSlot: (call, callback) => {
        let plat = active_tickets[call.request.ticket_id];
        if (!plat) {
            return callback({ code: grpc.status.NOT_FOUND, details: "ID Tiket tidak valid!" });
        }
        delete active_tickets[call.request.ticket_id];
        available_slots += 1;
        
        broadcastUpdate(`Keluar: ${plat} (Tiket: ${call.request.ticket_id})`);
        callback(null, {});
    },
    MonitorStatus: (call) => {
        dashboardStreams.push(call);
        
        // Kirim state awal: slot, log, DAN daftar kendaraan aktif
        call.write({ 
            sisa_slot: available_slots, 
            log_terakhir: "Initial Sync: Menghubungkan ke database server...",
            // Kita kirimkan daftar kendaraan dalam format JSON string agar mudah diproses
            data_kendaraan: JSON.stringify(active_tickets) 
        });

        call.on('cancelled', () => {
            dashboardStreams = dashboardStreams.filter(s => s !== call);
        });
    }
});

server.bindAsync('0.0.0.0:5002', grpc.ServerCredentials.createInsecure(), () => {
    console.log('[INVENTORY SERVICE] Berjalan di port 5002. Slot awal: 5');
});