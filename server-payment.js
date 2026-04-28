const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;

const server = new grpc.Server();
server.addService(parkitProto.PaymentService.service, {
    CalculateFee: (call, callback) => {
        let jam = call.request.durasi_jam || 1; 
        let tarif = jam * 5000; 
        
        callback(null, { total_harga: tarif, status: "Lunas" });
    }
});

server.bindAsync('0.0.0.0:5003', grpc.ServerCredentials.createInsecure(), () => {
    console.log('[PAYMENT SERVICE] Berjalan di port 5003. Tarif: 5000/jam');
});