// Import the Firebase SDKs from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyAwS7AZewx0L8KRGeFXB7Jq4BJEbSB0xO0",
  authDomain: "fxgroup-5dd7c.firebaseapp.com",
  projectId: "fxgroup-5dd7c",
  storageBucket: "fxgroup-5dd7c.firebasestorage.app",
  messagingSenderId: "982128077012",
  appId: "1:982128077012:web:e5088b7be662cecf20f341",
  measurementId: "G-9FRXZNCJQJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Handle Automatic Referral Tracking from URL
const pathSeg = window.location.pathname.replace(/^\/|\/$/g, '');
const adminId = pathSeg ? pathSeg : 'organic';

// Define the Telegram Group Links for Each Admin
const ADMIN_LINKS = {
  pinak: 'https://t.me/+SamplePinakLink',
  joy: 'https://t.me/+SampleJoyLink',
  trader123: 'https://t.me/+SampleTraderLink',
  organic: 'https://t.me/+MainCommunityLink' // Default / Main Link
};

document.addEventListener('DOMContentLoaded', () => {
  // Update the referral badge in UI to reflect detected Admin
  const adminBadgeText = document.getElementById('adminBadgeText');
  if (adminBadgeText) {
    adminBadgeText.textContent = adminId.toUpperCase();
  }

  // --- Modal Control Logic ---
  const modal = document.getElementById('registrationModal');
  const modalContent = document.getElementById('modalContent');
  const openBtns = [document.getElementById('openModalBtnNav'), document.getElementById('openModalBtnHero')];
  const closeBtn = document.getElementById('closeModalBtn');
  const backdrops = document.querySelectorAll('.modal-backdrop');

  const openModal = () => {
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
  };

  const closeModal = () => {
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');
  };

  openBtns.forEach(btn => btn?.addEventListener('click', openModal));
  closeBtn?.addEventListener('click', closeModal);
  backdrops.forEach(b => b.addEventListener('click', closeModal));

  // --- Form Submission Logic ---
  const form = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMsg = document.getElementById('errorMessage');
  const formContainer = document.getElementById('modalFormContainer');
  const successContainer = document.getElementById('modalSuccessContainer');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
    errorMsg.classList.add('hidden');

    const fullName = document.getElementById('fullName').value;
    let telegramUsername = document.getElementById('telegramUsername').value;
    const whatsappNumber = document.getElementById('whatsappNumber').value;

    // Auto-prepend @ if missing
    if (!telegramUsername.startsWith('@')) {
      telegramUsername = '@' + telegramUsername;
    }

    try {
      const currentDate = new Date();
      const dateString = currentDate.toLocaleDateString('en-GB'); 
      const timeString = currentDate.toLocaleTimeString('en-US', { hour12: true });
      const memberId = 'FX-' + Math.random().toString(36).substring(2, 10).toUpperCase(); // e.g. FX-B3X91ZQ1

      // Save structured registration data to Firestore automatically
      await addDoc(collection(db, 'registrations'), {
        fullName,
        telegramUsername,
        whatsappNumber,
        referralAdmin: adminId, // Extracted from URL path earlier
        referralUrl: window.location.href,
        sourceLink: document.referrer || 'Direct',
        registrationDate: dateString,
        registrationTime: timeString,
        memberId,
        timestamp: Date.now()
      });

      // Show Success State
      formContainer.classList.add('hidden');
      successContainer.classList.remove('hidden');
      successContainer.classList.add('flex');

      // Redirect user to the designated Admin Telegram Group after 2 seconds
      setTimeout(() => {
        const targetAdminKey = adminId.toLowerCase();
        const redirectUrl = ADMIN_LINKS[targetAdminKey] || ADMIN_LINKS['organic'];
        window.location.href = redirectUrl;
      }, 2000);

    } catch (error) {
      console.error("Error adding document: ", error);
      errorMsg.textContent = "Registration failed. Please check connection and try again.";
      errorMsg.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = "Join Community Group";
    }
  });

  // --- Animated Particle Background Rendering ---
  const canvas = document.getElementById('particleCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationFrameId;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
  };

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = Math.random() * 0.5 - 0.25;
      this.speedY = Math.random() * 0.5 - 0.25;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x > canvas.width) this.x = 0;
      if (this.x < 0) this.x = canvas.width;
      if (this.y > canvas.height) this.y = 0;
      if (this.y < 0) this.y = canvas.height;
    }
    draw() {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const initParticles = () => {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 15000);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  };

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
      for (let j = i; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 - dist / 1000})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    animationFrameId = requestAnimationFrame(animate);
  };

  window.addEventListener('resize', resize);
  resize();
  animate();
});
