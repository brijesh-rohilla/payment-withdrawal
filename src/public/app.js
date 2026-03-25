let activeUserId = null;
let activeUserName = '';
const stats = { total: 0, success: 0, failed: 0 };

async function boot() {
  try {
    const res = await fetch('/api/users');
    const users = await res.json();

    const btns = document.querySelectorAll('.user-switch button');
    users.forEach((u, i) => {
      if (btns[i]) {
        btns[i].dataset.uid = u._id;
        btns[i].dataset.name = u.name;
        btns[i].textContent = u.name;
      }
    });

    // Select first user by default
    if (btns[0]) selectUser(btns[0]);
  } catch {
    showAlert('Cannot reach server. Make sure it is running.', 'error');
  }
}

function selectUser(btn) {
  document.querySelectorAll('.user-switch button').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  activeUserId = btn.dataset.uid;
  activeUserName = btn.dataset.name;
  loadWallet();
  loadTransactions();
}

async function loadWallet() {
  try {
    const res = await fetch(`/api/users/${activeUserId}/wallet`);
    const data = await res.json();
    document.getElementById('balance').textContent = '₹' + (data.balanceInPaisa / 100).toFixed(2);
  } catch {
    document.getElementById('balance').textContent = '—';
  }
}

async function loadTransactions() {
  const list = document.getElementById('logList');
  list.innerHTML = '<div class="empty">Loading...</div>';

  try {
    const res = await fetch(`/api/users/${activeUserId}/transactions`);
    const logs = await res.json();

    if (!logs.length) {
      list.innerHTML = '<div class="empty">No transactions yet.</div>';
      return;
    }

    list.innerHTML = '';
    logs.forEach((log) => {
      const item = document.createElement('div');
      item.className = 'log-item';
      const date = new Date(log.createdAt).toLocaleString();
      item.innerHTML = `
        <div class="top">
          <span>₹${(log.amountInPaisa / 100).toFixed(2)} → ${log.meta?.destination || '—'}</span>
          <span>${date}</span>
        </div>
        <div class="row">
          <span>Before: ₹${(log.balanceBeforeInPaisa / 100).toFixed(2)} &rarr; After: ₹${(log.balanceAfterInPaisa / 100).toFixed(2)}</span>
          <span class="status-badge ${log.status}">${log.status}</span>
        </div>
      `;
      list.appendChild(item);
    });

    // update stats from real DB data
    stats.total = logs.length;
    stats.success = logs.filter((l) => l.status === 'success').length;
    stats.failed = logs.filter((l) => l.status === 'failed').length;
    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statSuccess').textContent = stats.success;
    document.getElementById('statFailed').textContent = stats.failed;
  } catch {
    list.innerHTML = '<div class="empty">Failed to load transactions.</div>';
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function submitWithdrawal() {
  const amountRupees = parseFloat(document.getElementById('amount').value);
  const destination = document.getElementById('destination').value.trim();

  if (!activeUserId) return showAlert('No user selected.', 'error');
  if (!amountRupees || amountRupees <= 0) return showAlert('Enter a valid amount.', 'error');
  if (!destination) return showAlert('Enter a destination.', 'error');

  const amountInPaisa = Math.round(amountRupees * 100);
  const idempotencyKey = generateUUID();

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const res = await fetch(`/api/users/${activeUserId}/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountInPaisa, destination, idempotencyKey }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(data.error || 'Request failed.', 'error');
    } else {
      showAlert('Queued! Checking status...', 'info');
      pollStatus(data.withdrawal?._id);
    }
  } catch {
    showAlert('Network error.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Withdrawal';
  }
}

async function pollStatus(withdrawalId) {
  if (!withdrawalId) return;

  try {
    const res = await fetch(`/api/users/${activeUserId}/withdrawals/${withdrawalId}`);
    const data = await res.json();

    if (data.status === 'success' || data.status === 'failed') {
      if (data.status === 'success') showAlert('Withdrawal successful!', 'success');
      else showAlert('Failed: ' + (data.failureReason || 'unknown error'), 'error');

      loadWallet();
      loadTransactions();
    } else {
      setTimeout(() => pollStatus(withdrawalId), 1200);
    }
  } catch {
    // silently stop polling on error
  }
}

function showAlert(msg, type) {
  const el = document.getElementById('alert');
  el.textContent = msg;
  el.className = `alert show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4000);
}

boot();
