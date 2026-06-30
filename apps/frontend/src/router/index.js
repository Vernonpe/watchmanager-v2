import { createRouter, createWebHistory } from 'vue-router';
import axios from 'axios';
import BuilderCanvas from '../views/BuilderCanvas.vue';
import OperationsConsole from '../views/OperationsConsole.vue';
import ConfigPanel from '../views/ConfigPanel.vue';
import LogsConsole from '../views/LogsConsole.vue';
import DashboardConsole from '../views/DashboardConsole.vue';
import Login from '../views/Login.vue';
import UserManagement from '../views/UserManagement.vue';

// Configure axios interceptor to append JWT token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('wm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Configure axios interceptor to handle expired token (401/403)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('wm_token');
      localStorage.removeItem('wm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardConsole
  },
  {
    path: '/builder',
    name: 'Builder',
    component: BuilderCanvas
  },
  {
    path: '/console',
    name: 'Console',
    component: OperationsConsole
  },
  {
    path: '/config',
    name: 'Config',
    component: ConfigPanel
  },
  {
    path: '/logs',
    name: 'Logs',
    component: LogsConsole
  },
  {
    path: '/users',
    name: 'Users',
    component: UserManagement
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Global Navigation Guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('wm_token');
  if (to.name !== 'Login' && !token) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
