const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/WatchManagerV2?authSource=admin');
  console.log('Connected');
  
  const sessions = await mongoose.connection.db.collection('runtime_whatsapp_sessions').find({}).toArray();
  console.log(JSON.stringify(sessions, null, 2));
  
  process.exit(0);
}
run();
