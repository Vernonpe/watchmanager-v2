<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const users = ref([]);
const currentUser = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);

// Form fields
const newUsername = ref('');
const newPassword = ref('');
const newEmail = ref('');
const newRole = ref('admin');

// Alerts
const successMsg = ref('');
const errorMsg = ref('');

// Load current user context
const loadUserContext = () => {
  const saved = localStorage.getItem('wm_user');
  if (saved) {
    currentUser.value = JSON.parse(saved);
  }
};

const fetchUsers = async () => {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await axios.get('/api/admin/users');
    users.value = res.data;
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to fetch user accounts';
  } finally {
    isLoading.value = false;
  }
};

const handleCreateUser = async () => {
  if (!newUsername.value || !newPassword.value || !newEmail.value) {
    errorMsg.value = 'Please fill in all required fields';
    return;
  }
  
  isSubmitting.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  
  try {
    await axios.post('/api/admin/users', {
      username: newUsername.value,
      password: newPassword.value,
      email: newEmail.value,
      role: newRole.value
    });
    
    successMsg.value = `User account "${newUsername.value}" created successfully!`;
    
    // Reset form
    newUsername.value = '';
    newPassword.value = '';
    newEmail.value = '';
    newRole.value = 'admin';
    
    // Refresh table
    await fetchUsers();
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to create user account';
  } finally {
    isSubmitting.value = false;
  }
};

const toggleUserStatus = async (user) => {
  if (currentUser.value && currentUser.value.username === user.username) {
    errorMsg.value = 'Security Guard: You cannot disable your own active login session!';
    return;
  }
  
  const targetStatus = user.status === 'active' ? 'disabled' : 'active';
  
  try {
    const res = await axios.post(`/api/admin/users/${user.username}/status`, {
      status: targetStatus
    });
    
    // Update local state
    user.status = res.data.status;
    successMsg.value = `Account status for "${user.username}" updated to ${user.status}.`;
    errorMsg.value = '';
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Failed to update user account status';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

onMounted(() => {
  loadUserContext();
  fetchUsers();
});
</script>

<template>
  <div class="user-management-view animated-fade-in">
    <header class="view-header glass-panel">
      <h2>User Accounts Management <span>Configure administrative logins and control credentials</span></h2>
    </header>

    <div class="split-layout">
      <!-- LEFT COLUMN: USERS LIST TABLE -->
      <div class="list-section glass-panel">
        <div class="section-title">
          <h3>Active Control Panel Accounts</h3>
          <button class="refresh-btn" @click="fetchUsers" :disabled="isLoading">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoading }">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>

        <div v-if="successMsg" class="alert-banner success animate-fade-in">
          <span>{{ successMsg }}</span>
        </div>
        <div v-if="errorMsg" class="alert-banner error animate-fade-in">
          <span>{{ errorMsg }}</span>
        </div>

        <div class="table-container">
          <table class="glass-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email Address</th>
                <th>Access Level</th>
                <th>Registration Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user._id" :class="{ 'disabled-row': user.status === 'disabled' }">
                <td class="username-cell">
                  <div class="avatar">{{ user.username[0].toUpperCase() }}</div>
                  <span>{{ user.username }}</span>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="user.role">{{ user.role }}</span>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <span class="status-indicator" :class="user.status">{{ user.status }}</span>
                </td>
                <td>
                  <button 
                    class="action-btn" 
                    :class="user.status === 'active' ? 'disable-btn' : 'enable-btn'"
                    @click="toggleUserStatus(user)"
                    :disabled="currentUser?.username === user.username"
                  >
                    {{ user.status === 'active' ? 'Disable' : 'Enable' }}
                  </button>
                </td>
              </tr>
              <tr v-if="users.length === 0 && !isLoading">
                <td colspan="6" class="empty-cell">No registered user accounts found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT COLUMN: CREATION FORM -->
      <div class="form-section glass-panel">
        <h3>Create New User Profile</h3>
        <p class="subtitle">Register a new administrator or support operator account.</p>

        <form @submit.prevent="handleCreateUser" class="creation-form">
          <div class="input-group">
            <label for="reg-username">Username</label>
            <input 
              v-model="newUsername" 
              type="text" 
              id="reg-username" 
              class="glass-input" 
              placeholder="e.g. support_operator_01" 
              required 
            />
          </div>

          <div class="input-group">
            <label for="reg-email">Email Address</label>
            <input 
              v-model="newEmail" 
              type="email" 
              id="reg-email" 
              class="glass-input" 
              placeholder="e.g. operator@novare.co.za" 
              required 
            />
          </div>

          <div class="input-group">
            <label for="reg-password">Password</label>
            <input 
              v-model="newPassword" 
              type="password" 
              id="reg-password" 
              class="glass-input" 
              placeholder="Min 6 characters" 
              required 
            />
          </div>

          <div class="input-group">
            <label for="reg-role">Access Authorization Level</label>
            <select v-model="newRole" id="reg-role" class="glass-input select-input">
              <option value="admin">Admin (Full Control Panel Privileges)</option>
              <option value="operator">Operator (Read/Monitoring Access Only)</option>
            </select>
          </div>

          <button type="submit" class="submit-btn" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="spinner"></span>
            <span v-else>Register User Account</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-management-view {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 100vh;
}

.view-header {
  padding: 1.5rem 2rem;
}

.view-header h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.view-header h2 span {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.split-layout {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.list-section {
  padding: 2rem;
  min-height: 500px;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.refresh-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.spinning {
  animation: spin 1s linear infinite;
}

.alert-banner {
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.alert-banner.success {
  background: rgba(40, 167, 69, 0.15);
  border: 1px solid rgba(40, 167, 69, 0.3);
  color: #52c41a;
}

.alert-banner.error {
  background: rgba(220, 53, 69, 0.15);
  border: 1px solid rgba(220, 53, 69, 0.3);
  color: #ff4d4f;
}

.table-container {
  overflow-x: auto;
}

.glass-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.glass-table th {
  padding: 1rem;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-family: 'Outfit', sans-serif;
}

.glass-table td {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.9rem;
  color: var(--text-primary);
}

.disabled-row {
  opacity: 0.5;
}

.username-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
}

.role-badge {
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.role-badge.admin {
  background: rgba(0, 240, 255, 0.1);
  color: var(--accent-cyan);
  border: 1px solid rgba(0, 240, 255, 0.25);
}

.role-badge.operator {
  background: rgba(243, 156, 18, 0.1);
  color: #f39c12;
  border: 1px solid rgba(243, 156, 18, 0.25);
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.status-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active {
  color: #52c41a;
}

.status-indicator.active::before {
  background-color: #52c41a;
  box-shadow: 0 0 8px #52c41a;
}

.status-indicator.disabled {
  color: var(--text-secondary);
}

.status-indicator.disabled::before {
  background-color: var(--text-secondary);
}

.action-btn {
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.disable-btn {
  background: rgba(220, 53, 69, 0.15);
  color: #ff4d4f;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.disable-btn:hover:not(:disabled) {
  background: rgba(220, 53, 69, 0.3);
}

.enable-btn {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.3);
}

.enable-btn:hover:not(:disabled) {
  background: rgba(82, 196, 26, 0.3);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-section {
  padding: 2rem;
}

.form-section h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.form-section .subtitle {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
}

.creation-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
}

.submit-btn {
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0.8rem;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-blue) 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
  box-shadow: 0 0 25px rgba(0, 240, 255, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-cell {
  text-align: center;
  color: var(--text-secondary);
  padding: 3rem !important;
}
</style>
