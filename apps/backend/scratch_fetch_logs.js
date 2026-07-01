const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/WatchManagerV2?authSource=admin');
  console.log('Connected');
  
  const devLogSchema = new mongoose.Schema({}, { strict: false });
  const DevLog = mongoose.model('dev_api_logs', devLogSchema);
  
  const logs = await DevLog.find({}).sort({ created_at: -1 }).limit(1);
  console.log(JSON.stringify(logs, null, 2));
  
  process.exit(0);
}

run().catch(console.error);
