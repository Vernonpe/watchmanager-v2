<template>
  <div class="app-container">
    <aside class="sidebar glass-panel">
      <div class="brand">
        <div class="brand-logo">WM</div>
        <h2>WatchManager <span>V2</span></h2>
      </div>
      
      <nav class="nav-links">
        <router-link to="/" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </router-link>
        <router-link to="/builder" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          Journey Builder
        </router-link>
        <router-link to="/config" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Config Panel
        </router-link>
        <router-link to="/logs" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Audit Logs
        </router-link>
        <router-link to="/console" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <line x1="6" y1="6" x2="6" y2="6.01" />
            <line x1="6" y1="18" x2="6" y2="18.01" />
          </svg>
          Operations Console
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="tenant-badge">
          <div class="indicator active"></div>
          <span>tenant_watchmanager_prod_01</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.sidebar {
  width: 280px;
  margin: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 32px);
  border-radius: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.brand-logo {
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
  color: hsl(222, 25%, 6%);
  font-weight: 700;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.brand h2 {
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.brand h2 span {
  color: var(--accent-cyan);
  font-size: 0.9rem;
  font-weight: 700;
  background: rgba(186, 100, 50, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-grow: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  transition: var(--transition-smooth);
}

.nav-item:hover {
  background: var(--bg-surface-hover);
  color: var(--text-main);
}

.nav-item.router-link-active {
  background: rgba(186, 100, 50, 0.08);
  border: 1px solid rgba(186, 100, 50, 0.15);
  color: var(--accent-cyan);
  box-shadow: 0 0 15px -5px hsla(186, 100, 48%, 0.1);
}

.icon {
  width: 20px;
  height: 20px;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid var(--border-light);
  padding-top: 16px;
}

.tenant-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.indicator.active {
  background-color: var(--accent-green);
  box-shadow: 0 0 8px var(--accent-green);
}

.main-content {
  flex-grow: 1;
  padding: 16px 16px 16px 0;
  height: 100vh;
  overflow: hidden;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
