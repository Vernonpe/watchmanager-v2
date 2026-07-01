const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/WatchManagerV2?authSource=admin');
  console.log('Connected');
  
  const exceptions = await mongoose.connection.db.collection('audit_system_exceptions').find({}).sort({created_at: -1}).limit(5).toArray();
  console.log(JSON.stringify(exceptions, null, 2));
  
  process.exit(0);
}
run();
