import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

let apiBaseUrl = '';
if (window.location.hostname === 'localhost' && window.location.port === '5173') {
  apiBaseUrl = 'http://localhost:3001';
}
axios.defaults.baseURL = apiBaseUrl;

const app = createApp(App)
app.use(router)
app.mount('#app')
