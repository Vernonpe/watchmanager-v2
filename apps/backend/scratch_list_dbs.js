const mongoose = require('mongoose');

async function run() {
  const conn = await mongoose.createConnection('mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/?authSource=admin').asPromise();
  console.log('Connected');
  
  const adminDb = conn.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log(JSON.stringify(dbs, null, 2));
  
  process.exit(0);
}
run();
