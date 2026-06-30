# Watch Manager V2 - Backend Services

This is the Express.js backend server for Watch Manager V2. It handles database schemas, schedules concurrency locking, executes WhatsApp message state-machine loops, and processes preemption stack overrides.

---

## 📂 Backend Structure

```text
apps/backend/
├── src/
│   ├── app.js            # Server entrance, Mongoose connection, and routing
│   ├── db/
│   │   └── schemas.js    # Collection schemas (Tenants, Credentials, Journeys, Sessions, Audits)
│   ├── interpreter/
│   │   ├── interpreter.js # State-machine transition logic
│   │   └── preemptionManager.js # Alarm incident stack manager
│   ├── middleware/
│   │   └── concurrency.js # Multi-session queue lock mutex
│   └── routes/
│       ├── admin.js      # Configuration CRUD & analytics logs API endpoints
│       └── webhooks.js   # WhatsApp messaging & alarm ingress trigger webhooks
└── tests/
    ├── mockServer.js     # QA Mock Control Room REST endpoints
    └── simulate.js       # End-to-end integration test runner
```

---

## 💾 Database Collections

The MongoDB database (`WatchManagerV2`) contains the following collection schemas:

1. **`sys_tenants`**: Registered customer account profiles and Platform UUID references (status can be `active`, `suspended`, or `trial`).
2. **`sys_channel360_credentials`**: C360 Org ID, API bearer credentials, control room endpoints, and `allow_template_messages` permission configuration.
3. **`builder_journeys`**: Visual blueprints compiled using nodes (Text, Buttons, Inputs, Conditions), `tag` descriptions, and transition edges.
4. **`builder_menus`**: Customizable Main Menu routing configuration (headers, intro text, and subflow mappings).
5. **`runtime_whatsapp_sessions`**: Session state tracking active node contexts, preemption overrides status, `is_at_main_menu` flags, circular duplicate filters, and collected variables.
6. **`audit_webhook_stream`**: Inbound WhatsApp callbacks and receipt streams.
7. **`audit_api_outbound_logs`**: Logs of Axios API requests made to C360 and external control rooms.
8. **`audit_system_exceptions`**: System logs of runtime exceptions and call-stack errors.

---

## ⚡ API Endpoint Routing Reference

### Admin Panel REST APIs (`/api/admin`)
- `GET /tenants`: Lists all commercial tenants.
- `POST /tenants`: Creates or updates a tenant profile.
- `GET /credentials`: Fetches C360 integration keys for the header `x-tenant-id`.
- `POST /credentials`: Updates C360 keys for the header `x-tenant-id`.
- `GET /menu`: Fetches the Main Menu routing configuration for the header `x-tenant-id`.
- `POST /menu`: Saves or updates the Main Menu routing configuration for the header `x-tenant-id`.
- `GET /journeys`: Lists journeys for the header `x-tenant-id`.
- `POST /journeys`: Saves or updates a journey blueprint.
- `GET /sessions`: Lists active whatsapp subscriber sessions.
- `GET /live_feed`: Streams last 50 webhook messages for live diagnostics.
- `GET /logs`: Unified search query endpoint across audits.
- `GET /dashboard_stats`: Aggregate statistics metrics for the homepage panel.
- `DELETE /tenants/:id`: Purges a customer profile and all related database collections.

### WhatsApp Ingress Webhooks (`/api`)
- `POST /:platformUuid/whatsapp/messages`: Dynamic inbound messaging endpoint.
- `POST /:platformUuid/whatsapp/notifications`: Dynamic delivery notifications.
- `POST /webhook/alarm/trigger`: High-priority incident panic escalation trigger.
