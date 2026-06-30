<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const username = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = 'Please enter both username and password';
    return;
  }
  
  isLoading.value = true;
  errorMsg.value = '';
  
  try {
    const res = await axios.post('/api/auth/login', {
      username: username.value,
      password: password.value
    });
    
    // Save token and user details to localStorage
    localStorage.setItem('wm_token', res.data.token);
    localStorage.setItem('wm_user', JSON.stringify(res.data.user));
    
    // Redirect to dashboard
    router.push('/');
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      errorMsg.value = err.response.data.error;
    } else {
      errorMsg.value = 'Failed to connect to backend service';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-card glass-panel animated-fade-in">
      <div class="brand-header">
        <img src="/novare_logo.png" class="novare-logo" alt="Novare Logo" />
        <h2 class="brand-subtitle">WatchManager <span>V2</span></h2>
      </div>

      <div class="login-form">
        <h3>Sign In</h3>
        <p class="subtitle">Access your technical control panel</p>

        <div v-if="errorMsg" class="error-banner animate-fade-in">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ errorMsg }}</span>
        </div>

        <form @submit.prevent="handleLogin">
          <div class="input-group">
            <label for="username">Username</label>
            <input 
              v-model="username" 
              type="text" 
              id="username" 
              class="glass-input" 
              placeholder="Enter username" 
              autocomplete="username"
              required 
            />
          </div>

          <div class="input-group">
            <label for="password">Password</label>
            <input 
              v-model="password" 
              type="password" 
              id="password" 
              class="glass-input" 
              placeholder="Enter password" 
              autocomplete="current-password"
              required 
            />
          </div>

          <button type="submit" class="submit-btn" :disabled="isLoading">
            <span v-if="isLoading" class="spinner"></span>
            <span v-else>Login</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100vw;
  background-color: var(--bg-primary);
  background-image: radial-gradient(circle at 10% 20%, rgba(26, 21, 44, 0.95) 0%, rgba(13, 10, 18, 0.98) 90%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
}

.brand-header {
  margin-bottom: 2rem;
}

.novare-logo {
  max-width: 150px;
  height: auto;
  margin-bottom: 0.5rem;
}

.brand-subtitle {
  font-family: 'Outfit', sans-serif;
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.brand-subtitle span {
  color: var(--accent-cyan);
}

.login-form h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.login-form .subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  color: #ff6b7d;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  text-align: left;
}

.input-group {
  margin-bottom: 1.25rem;
  text-align: left;
}

.input-group label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.glass-input {
  width: 100%;
}

.submit-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 0 25px rgba(0, 240, 255, 0.45);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
