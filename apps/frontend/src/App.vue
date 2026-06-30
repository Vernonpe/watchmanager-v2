<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const isCollapsed = ref(false);
const route = useRoute();
const router = useRouter();

// Show navigation only if route name is not 'Login'
const showNav = computed(() => route.name !== 'Login');

// Get current username for footer display
const currentUsername = computed(() => {
  const saved = localStorage.getItem('wm_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    return parsed.username;
  }
  return 'tenant_watchmanager_prod_01';
});

const handleLogout = () => {
  localStorage.removeItem('wm_token');
  localStorage.removeItem('wm_user');
  router.push('/login');
};
</script>

<template>
  <div class="app-container">
    <aside v-if="showNav" class="sidebar glass-panel animate-width" :class="{ collapsed: isCollapsed }">
      <!-- Collapse Toggle Button -->
      <button class="collapse-toggle-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
        <svg v-if="isCollapsed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="brand">
        <img v-if="isCollapsed" src="/novare_icon.png" class="brand-logo-img collapsed animate-fade-in" alt="Novare Icon" />
        <div v-else class="brand-expanded-container animate-fade-in">
          <img src="/novare_logo.png" class="brand-logo-img expanded" alt="Novare Logo" />
          <h2 class="brand-subtitle">WatchManager <span>V2</span></h2>
        </div>
      </div>
      
      <nav class="nav-links">
        <router-link to="/" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Dashboard</span>
        </router-link>
        <router-link to="/builder" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Journey Builder</span>
        </router-link>
        <router-link to="/config" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Config Panel</span>
        </router-link>
        <router-link to="/logs" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Audit Logs</span>
        </router-link>
        <router-link to="/console" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" />
            <line x1="6" y1="6" x2="6" y2="6.01" />
            <line x1="6" y1="18" x2="6" y2="18.01" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Operations Console</span>
        </router-link>

        <router-link to="/sessions" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Active Sessions</span>
        </router-link>

        <!-- User Management Link -->
        <router-link to="/users" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">User Accounts</span>
        </router-link>

        <!-- Developer Console Link -->
        <router-link to="/dev" class="nav-item">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
          <span v-if="!isCollapsed" class="nav-label">Dev Console</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="tenant-badge" :title="isCollapsed ? currentUsername : ''">
          <div class="indicator active"></div>
          <span v-if="!isCollapsed">{{ currentUsername }}</span>
        </div>
        
        <!-- Logout Action Button -->
        <button class="logout-btn" @click="handleLogout" :title="isCollapsed ? 'Logout' : ''">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span v-if="!isCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <main class="main-content" :class="{ 'full-width': !showNav }">
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
  position: relative;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 80px;
  padding: 24px 12px;
  align-items: center;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 40px;
  width: 100%;
}

.brand-expanded-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.brand-logo-img.collapsed {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.brand-logo-img.expanded {
  width: 100%;
  max-width: 220px;
  height: auto;
  object-fit: contain;
}

.brand-subtitle {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-subtitle span {
  color: var(--accent-cyan);
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(0, 220, 200, 0.1);
  padding: 1px 6px;
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
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.logout-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  color: #ff4d4f;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 8px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(220, 53, 69, 0.2);
  border-color: rgba(220, 53, 69, 0.4);
}

.sidebar.collapsed .logout-btn {
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
}

.main-content {
  flex-grow: 1;
  padding: 16px 16px 16px 0;
  height: 100vh;
  overflow: hidden;
}

.main-content.full-width {
  padding: 0;
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

/* Collapse toggle button styles */
.collapse-toggle-btn {
  position: absolute;
  top: 24px;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-glass);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 100;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.collapse-toggle-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  box-shadow: var(--shadow-glow-cyan);
  transform: scale(1.1);
}

/* Collapsed navigation styles */
.sidebar.collapsed .brand {
  gap: 0;
  justify-content: center;
  margin-bottom: 30px;
}

.sidebar.collapsed .nav-links {
  align-items: center;
}

.sidebar.collapsed .nav-item {
  width: 44px;
  height: 44px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  gap: 0;
}

.sidebar.collapsed .tenant-badge {
  padding: 10px;
  justify-content: center;
}

/* Smooth transition for width */
.animate-width {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
