# Watch Manager V2 - Frontend Application

This is the Vue 3 Single Page Application (SPA) for Watch Manager V2. It is powered by Vite and compiled into static assets served by the backend in production.

---

## 📂 Frontend Structure

```text
apps/frontend/
├── src/
│   ├── assets/           # Typography, icons, and HSL style guides
│   ├── components/       # Custom Vue Flow nodes and reusable widgets
│   ├── router/
│   │   └── index.js      # Route definitions mapping views
│   ├── views/
│   │   ├── DashboardConsole.vue  # Stats & health metrics panel (Default Home)
│   │   ├── BuilderCanvas.vue     # Visual drag-and-drop flowbuilder canvas
│   │   ├── ConfigPanel.vue       # Tenant profile & credentials accordion
│   │   ├── LogsConsole.vue       # Searchable audit log payload inspector
│   │   └── OperationsConsole.vue # Live message stream and preemption tests
│   ├── App.vue           # Sidebar shell navigation
│   └── main.js           # Vue instantiation and Axios default base URL config
├── vite.config.js        # Vite configurations
└── index.html            # Application entrypoint HTML
```

---

## 🎨 Typography & Design Theme
The frontend uses a high-premium glassmorphism theme using Vanilla CSS variables:
- **Font**: Outfit (Google Fonts)
- **Palette**: tailored HSL values:
  - Background surface: Sleek Dark HSL
  - Highlights: Accent Cyan (`hsl(186, 100%, 48%)`), Orange (`hsl(40, 100%, 50%)`), and Green (`hsl(150, 100%, 40%)`)
- **Effects**: Micro-animations and glowing shadows on hovering key-value metrics.

---

## ⚡ Routing Configurations

Sidebar links navigate to the following page views:
1. **Dashboard**: `/` (health metrics and webhook traffic)
2. **Journey Builder**: `/builder` (Visual VueFlow blueprint builder)
3. **Config Panel**: `/config` (tenant profile manager with accordion blocks)
4. **Audit Logs**: `/logs` (searchable database logs inspector)
5. **Operations Console**: `/console` (live diagnostic monitor feed)
