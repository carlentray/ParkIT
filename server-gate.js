const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;

const inventoryClient = new parkitProto.InventoryService('localhost:5002', grpc.credentials.createInsecure());
const paymentClient = new parkitProto.PaymentService('localhost:5003', grpc.credentials.createInsecure());

const server = new grpc.Server();
server.addService(parkitProto.GateService.service, {
    RecordEntry: (call, callback) => {
        inventoryClient.ReserveSlot({ plat_nomor: call.request.plat_nomor }, (err, response) => {
            if (err) return callback(err); 
            callback(null, response);
        });
    },
    VerifyTicket: (call, callback) => {
        inventoryClient.VerifyTicket({ ticket_id: call.request.ticket_id }, (err, response) => {
            if (err) return callback(err);
            callback(null, response);
        });
    },
    ProcessExit: (call, callback) => {
        // 1. Tanya Inventory dulu
        inventoryClient.FreeSlot({ ticket_id: call.request.ticket_id }, (err, invRes) => {
            if (err) return callback(err); // Jika tiket tidak ada, langsung kirim error
            
            // 2. Jika ada, baru tanya Payment
            paymentClient.CalculateFee({ 
                ticket_id: call.request.ticket_id, 
                durasi_jam: call.request.durasi_jam 
            }, (err2, payRes) => {
                if (err2) return callback(err2);
                callback(null, payRes); // Ini yang bikin pesan sampai ke Web Gateway!
            });
        });
    }
});

server.bindAsync('0.0.0.0:5001', grpc.ServerCredentials.createInsecure(), () => {
    console.log('[GATE SERVICE] Berjalan di port 5001');
});