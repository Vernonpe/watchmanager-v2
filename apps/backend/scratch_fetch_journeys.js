const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://admin:wC8%40Rz3%24L5%23sP9qT@13.245.26.99:27017/WatchManagerV2?authSource=admin');
  console.log('Connected');
  
  const journeys = await mongoose.connection.db.collection('builder_journeys').find({}).toArray();
  if (journeys.length > 0) {
    console.log(JSON.stringify(journeys[0].edges, null, 2));
  } else {
    console.log('No journeys found');
  }
  
  process.exit(0);
}
run();
