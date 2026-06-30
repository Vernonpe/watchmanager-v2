import { createRouter, createWebHistory } from 'vue-router';
import BuilderCanvas from '../views/BuilderCanvas.vue';
import OperationsConsole from '../views/OperationsConsole.vue';
import ConfigPanel from '../views/ConfigPanel.vue';
import LogsConsole from '../views/LogsConsole.vue';
import DashboardConsole from '../views/DashboardConsole.vue';

const routes = [
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
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
