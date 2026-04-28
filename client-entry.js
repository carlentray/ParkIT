const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;
const readline = require('readline');

const gateClient = new parkitProto.GateService('localhost:5001', grpc.credentials.createInsecure());
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askForEntry() {
    rl.question('\n[MESIN MASUK] Ketik Plat Nomor: ', (plat) => {
        gateClient.RecordEntry({ plat_nomor: plat }, (err, response) => {
            if (err) {
                console.log(`[ERROR] ${err.details} (Code: ${err.code})`);
            } else {
                console.log(`[SUKSES] ${response.status}. ID Tiket: ${response.ticket_id}`);
            }
            askForEntry(); // Looping biar nanya terus
        });
    });
}
askForEntry();