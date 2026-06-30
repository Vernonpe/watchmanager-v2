require('dotenv').config();
const mongoose = require('mongoose');
const { SysTenants, SysChannel360Credentials } = require('../src/db/schemas');
const crypto = require('crypto');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/WatchManagerV2';

const seedTenant = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at ${MONGO_URI}`);

    // Create Demo Tenant
    const tenantId = 'tenant_watchmanager_prod_01';
    
    // Check if exists
    let tenant = await SysTenants.findOne({ tenant_id: tenantId });
    if (!tenant) {
      tenant = new SysTenants({
        tenant_id: tenantId,
        platform_uuid: crypto.randomUUID(),
        name: 'Watch Manager Demo Tenant',
        status: 'active',
        contact_email: 'demo@watchmanager.co.za'
      });
      await tenant.save();
      console.log('Created new demo tenant: ' + tenant.name);
    } else {
      console.log('Demo tenant already exists.');
    }

    // Create Credentials
    let creds = await SysChannel360Credentials.findOne({ tenant_id: tenantId });
    if (!creds) {
      creds = new SysChannel360Credentials({
        tenant_id: tenantId,
        org_id: 'demo_org_id_123',
        bearer_token: 'demo_bearer_token_abc',
        channel_account_name: 'WatchManagerDemo',
        watch_manager_base_url: 'https://api.watchmanager.co.za/v1',
        is_test_mode: true,
        allow_template_messages: true
      });
      await creds.save();
      console.log('Created Channel360 credentials for demo tenant.');
    } else {
      console.log('Credentials already exist for demo tenant.');
    }

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

seedTenant();
