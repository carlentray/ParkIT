const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;

const inventoryClient = new parkitProto.InventoryService('localhost:5002', grpc.credentials.createInsecure());

const call = inventoryClient.MonitorStatus({});
call.on('data', (response) => {
    console.clear();
    console.log("===============================");
    console.log("   DASHBOARD PARKIT (LIVE)");
    console.log("===============================");
    console.log(`> SISA SLOT PARKIR : ${response.sisa_slot}`);
    console.log(`> AKTIVITAS TERAKHIR: ${response.log_terakhir}`);
    console.log("===============================");
});