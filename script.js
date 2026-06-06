const ADMIN = { name: 'Akash Rajput', email: 'akash@comparo.com', password: 'Rajputboys', isAdmin: true };

let currentUser = null;
let pendingUser = null;
let generatedOTP = null;
let allUsers = JSON.parse(localStorage.getItem('comparo_users') || '[]');

let otpTimer = null;
let otpTimeRemaining = 0;
const OTP_TIMEOUT = 60;

window.addEventListener('load', () => {
  const saved = localStorage.getItem('comparo_session');
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavUI();
  } else {
    document.getElementById('authModal').style.display = 'flex';
    toggleAuth('login');
  }
});

function toggleAuth(form) {
  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('verifyForm').style.display = 'none';
  document.getElementById(form + 'Form').style.display = 'block';
  clearErrors();
}

function clearErrors() {
  ['signupError', 'loginError', 'otpError'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) return showErr('signupError', 'All fields are required');
  if (password.length < 6) return showErr('signupError', 'Password must be at least 6 characters');
  if (allUsers.find(u => u.email === email)) return showErr('signupError', 'Email already registered. Please login.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr('signupError', 'Enter a valid email address');

  pendingUser = { name, email, password };
  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated OTP:', generatedOTP);

  try {
    await sendOTPEmail(email, name, generatedOTP);
    document.getElementById('verifySubtitle').textContent = `Enter the 6-digit code sent to ${email}`;
    const otpSentEl = document.getElementById('otpSent');
    if (otpSentEl) {
      otpSentEl.style.display = 'block';
      otpSentEl.innerHTML = '✅ Code sent! Check your email (also check spam)';
    }
    startOTPTimer();
    toggleAuth('verify');
  } catch(e) {
    console.error('Email error:', e);
    showErr('signupError', 'Failed to send email. Check your EmailJS setup or try again later.');
  }
}

async function sendOTPEmail(email, name, otp) {
  const SERVICE_ID = 'service_gjcasld';
  const TEMPLATE_ID = 'template_pbxpqg4';
  const PUBLIC_KEY = '0ra58-BTu4ENry2VB';

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: email,
        to_name: name,
        otp_code: otp,
        otp_message: `Your Comparo verification code is: ${otp}`
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('EmailJS API Error:', error);
    throw new Error('Failed to send OTP email');
  }

  const result = await response.json();
  console.log('✅ Email sent successfully!');
  return result;
}

function startOTPTimer() {
  if (otpTimer) clearInterval(otpTimer);

  otpTimeRemaining = OTP_TIMEOUT;
  const resendBtn = document.getElementById('resendOTPBtn');
  const timerDisplay = document.getElementById('otpTimerDisplay');

  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.opacity = '0.5';
    resendBtn.style.cursor = 'not-allowed';
  }

  otpTimer = setInterval(() => {
    otpTimeRemaining--;

    if (timerDisplay) {
      if (otpTimeRemaining > 0) {
        timerDisplay.textContent = `Resend in ${otpTimeRemaining}s`;
      } else {
        timerDisplay.textContent = '';
      }
    }

    if (otpTimeRemaining <= 0) {
      clearInterval(otpTimer);
      otpTimer = null;

      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.style.opacity = '1';
        resendBtn.style.cursor = 'pointer';
      }
    }
  }, 1000);
}

async function resendOTP() {
  if (otpTimeRemaining > 0 || !pendingUser) return;

  generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('New OTP generated:', generatedOTP);

  const resendBtn = document.getElementById('resendOTPBtn');
  const originalText = resendBtn.textContent;
  
  try {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';

    await sendOTPEmail(pendingUser.email, pendingUser.name, generatedOTP);

    const otpSentEl = document.getElementById('otpSent');
    if (otpSentEl) {
      otpSentEl.style.display = 'block';
      otpSentEl.innerHTML = '✅ New code sent! Check your email';
    }

    document.querySelectorAll('.otp-box').forEach(box => box.value = '');
    startOTPTimer();
    resendBtn.textContent = originalText;

    setTimeout(() => {
      if (otpSentEl) otpSentEl.style.display = 'none';
    }, 3000);

  } catch(e) {
    console.error('Resend OTP error:', e);
    resendBtn.textContent = originalText;
    showErr('otpError', '❌ Failed to resend code. Please try again.');
  }
}

function otpNext(input, index) {
  const boxes = document.querySelectorAll('.otp-box');
  input.value = input.value.replace(/[^0-9]/g, '');
  
  if (input.value.length === 1 && index < 5) {
    boxes[index + 1].focus();
  }

  const enteredOTP = Array.from(boxes).map(b => b.value).join('');
  if (enteredOTP.length === 6) {
    verifyOTP();
  }
}

function verifyOTP() {
  const boxes = document.querySelectorAll('.otp-box');
  const entered = Array.from(boxes).map(b => b.value).join('');

  if (entered.length !== 6) return showErr('otpError', 'Enter all 6 digits');
  if (entered !== generatedOTP) return showErr('otpError', '❌ Wrong code. Please try again.');

  document.getElementById('otpError').style.display = 'none';
  if (otpTimer) clearInterval(otpTimer);

  const newUser = {
    id: Date.now(),
    name: pendingUser.name,
    email: pendingUser.email,
    password: pendingUser.password,
    createdAt: new Date().toISOString(),
    verified: true,
    searches: [],
    alerts: []
  };

  allUsers.push(newUser);
  localStorage.setItem('comparo_users', JSON.stringify(allUsers));

  currentUser = newUser;
  localStorage.setItem('comparo_session', JSON.stringify(currentUser));

  document.getElementById('authModal').style.display = 'none';
  updateNavUI();

  console.log('✅ Account created successfully!');
  alert('Welcome to Comparo! Your account has been verified.');
}

function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) return showErr('loginError', 'All fields are required');

  if (email === ADMIN.email && password === ADMIN.password) {
    currentUser = ADMIN;
    localStorage.setItem('comparo_session', JSON.stringify(currentUser));
    document.getElementById('authModal').style.display = 'none';
    updateNavUI();
    return;
  }

  const user = allUsers.find(u => u.email === email && u.password === password);
  if (!user) return showErr('loginError', '❌ Wrong email or password');

  currentUser = user;
  localStorage.setItem('comparo_session', JSON.stringify(currentUser));
  document.getElementById('authModal').style.display = 'none';
  updateNavUI();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('comparo_session');
  if (otpTimer) clearInterval(otpTimer);
  document.getElementById('navRight').style.display = 'none';
  document.getElementById('authModal').style.display = 'flex';
  toggleAuth('login');
}

function updateNavUI() {
  if (!currentUser) return;
  const navRight = document.getElementById('navRight');
  if (navRight) navRight.style.display = 'flex';
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = currentUser.name;
  const userAvatar = document.getElementById('userAvatar');
  if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
}

function switchTab(name, btn) {
  if (btn) {
    const buttons = document.querySelectorAll('.nav-center button');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  console.log('Switched to tab:', name);
}
