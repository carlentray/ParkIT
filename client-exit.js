const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('parkit.proto', {keepCase: true});
const parkitProto = grpc.loadPackageDefinition(packageDefinition).parkit;
const readline = require('readline');

const gateClient = new parkitProto.GateService('localhost:5001', grpc.credentials.createInsecure());
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askForExit() {
    rl.question('\n[MESIN KELUAR] Ketik ID Tiket: ', (ticket) => {
        
        // TANYA SERVER DULU: "TIKET INI VALID GA?"
        gateClient.VerifyTicket({ ticket_id: ticket }, (err, _) => {
            if (err) {
                // KALAU GAGAL, LANGSUNG MUNCUL ERROR & NGULANG NANYA ID
                console.log(`[ERROR] ${err.details}`);
                return askForExit(); 
            }
            
            // KALAU SUKSES, BARU NANYA JAM
            rl.question('[MESIN KELUAR] Durasi parkir (jam)? Ketik angka: ', (jam) => {
                gateClient.ProcessExit({ 
                    ticket_id: ticket, 
                    durasi_jam: parseInt(jam) 
                }, (err2, response) => {
                    if (err2) {
                        console.log(`[ERROR] ${err2.details}`);
                    } else {
                        console.log(`[SUKSES] Total Tagihan: Rp ${response.total_harga} (${response.status})`);
                    }
                    askForExit(); 
                });
            });
        });

    });
}
askForExit();