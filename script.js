import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js";
import { vertexShader, fluidShader, displayShader } from "./shader.js";

// ====== INTERSECTION OBSERVER ======
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry)
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        } else {
            entry.target.classList.remove("show");
        }
    });
});

const hiddenElements = document.querySelectorAll(".hidden")
hiddenElements.forEach((el) => observer.observe(el));

// ====== NAVBAR FUNCTIONALITY ======
const navbar = document.querySelector('.navbar');
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const navLinks = document.querySelector('.nav-links');
const overlay = document.querySelector('.overlay');
let isMenuOpen = false;

// Scroll effect for navbar
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Toggle mobile menu
function toggleMenu() {
  isMenuOpen = !isMenuOpen;
  mobileNavToggle.classList.toggle('active');
  navLinks.classList.toggle('active');
  overlay.classList.toggle('active');
  document.body.style.overflow = isMenuOpen ? 'hidden' : '';
}

if (mobileNavToggle) mobileNavToggle.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    if (isMenuOpen) toggleMenu();
  });
});

// Close menu on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isMenuOpen) toggleMenu();
});

// Prevent scroll when menu is open
window.addEventListener('resize', () => {
  if (window.innerWidth > 768 && isMenuOpen) {
    toggleMenu();
  }
});

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  document.body.style.backgroundPosition = `center ${scrollY * 0.2}px`;
});

// ====== BACKGROUND GRADIENT ======

const config = {
  brushSize: 25.0,
  brushStrength: 0.5,
  distortionAmount: 2.5,
  fluidDecay: 0.98,
  trailLength: 0.8,
  stopdecay: 0.85,
  color1: "#000958ff",
  color2: "#000000ff",
  color3: "#0133ff",
  color4: "#6670feff",
  colorIntensity: 1.0,
  softness: 1.0,
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const gradientCanvas = document.querySelector(".gradient-canvas");

if (!gradientCanvas) {
  console.error("gradient-canvas element not found!");
} else {
  renderer.setSize(window.innerWidth, window.innerHeight);
  gradientCanvas.appendChild(renderer.domElement);

  const fluidTarget1 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    }
  );

  const fluidTarget2 = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    }
  );

  let currentFluidTarget = fluidTarget1;
  let previousFluidTarget = fluidTarget2;
  let frameCount = 0;

  const fluidMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      iFrame: { value: 0 },
      iPreviousFrame: { value: null },
      uBrushSize: { value: config.brushSize },
      uBrushStrength: { value: config.brushStrength },
      uFluidDecay: { value: config.fluidDecay },
      uTrailLength: { value: config.trailLength },
      uStopDecay: { value: config.stopdecay },
    },
    vertexShader: vertexShader,
    fragmentShader: fluidShader,
  });

  const displayMaterial = new THREE.ShaderMaterial({
    uniforms: {
      iTime: { value: 0 },
      iResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      iFluid: { value: null },
      uDistortionAmount: { value: config.distortionAmount },
      uColor1: { value: new THREE.Vector3(...hexToRgb(config.color1)) },
      uColor2: { value: new THREE.Vector3(...hexToRgb(config.color2)) },
      uColor3: { value: new THREE.Vector3(...hexToRgb(config.color3)) },
      uColor4: { value: new THREE.Vector3(...hexToRgb(config.color4)) },
      uColorIntensity: { value: config.colorIntensity },
      uSoftness: { value: config.softness },
    },
    vertexShader: vertexShader,
    fragmentShader: displayShader,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const fluidPlane = new THREE.Mesh(geometry, fluidMaterial);
  const displayPlane = new THREE.Mesh(geometry, displayMaterial);

  let mouseX = 0,
    mouseY = 0;
  let prevMouseX = 0,
    prevMouseY = 0;
  let lastMoveTime = 0;

  document.addEventListener("mousemove", (e) => {
    const rect = gradientCanvas.getBoundingClientRect();
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = e.clientX - rect.left;
    mouseY = rect.height - (e.clientY - rect.top);
    lastMoveTime = performance.now();
    fluidMaterial.uniforms.iMouse.value.set(
      mouseX,
      mouseY,
      prevMouseX,
      prevMouseY
    );
  });

  document.addEventListener("mouseleave", () => {
    fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
  });

  function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;
    fluidMaterial.uniforms.iTime.value = time;
    displayMaterial.uniforms.iTime.value = time;
    fluidMaterial.uniforms.iFrame.value = frameCount;

    if (performance.now() - lastMoveTime > 100) {
      fluidMaterial.uniforms.iMouse.value.set(0, 0, 0, 0);
    }

    fluidMaterial.uniforms.uBrushSize.value = config.brushSize;
    fluidMaterial.uniforms.uBrushStrength.value = config.brushStrength;
    fluidMaterial.uniforms.uFluidDecay.value = config.fluidDecay;
    fluidMaterial.uniforms.uTrailLength.value = config.trailLength;
    fluidMaterial.uniforms.uStopDecay.value = config.stopdecay;

    displayMaterial.uniforms.uDistortionAmount.value = config.distortionAmount;
    displayMaterial.uniforms.uColorIntensity.value = config.colorIntensity;
    displayMaterial.uniforms.uSoftness.value = config.softness;
    displayMaterial.uniforms.uColor1.value.set(...hexToRgb(config.color1));
    displayMaterial.uniforms.uColor2.value.set(...hexToRgb(config.color2));
    displayMaterial.uniforms.uColor3.value.set(...hexToRgb(config.color3));
    displayMaterial.uniforms.uColor4.value.set(...hexToRgb(config.color4));

    fluidMaterial.uniforms.iPreviousFrame.value = previousFluidTarget.texture;
    renderer.setRenderTarget(currentFluidTarget);
    renderer.render(fluidPlane, camera);

    displayMaterial.uniforms.iFluid.value = currentFluidTarget.texture;
    renderer.setRenderTarget(null);
    renderer.render(displayPlane, camera);

    const temp = currentFluidTarget;
    currentFluidTarget = previousFluidTarget;
    previousFluidTarget = temp;

    frameCount++;
  }

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);
    fluidMaterial.uniforms.iResolution.value.set(width, height);
    displayMaterial.uniforms.iResolution.value.set(width, height);

    fluidTarget1.setSize(width, height);
    fluidTarget2.setSize(width, height);
    frameCount = 0;
  });

  animate();
}


// ====== SNAP SCROLLING ======
let isAnimating = false;
let animationFrame = null;
let currentSectionIndex = 0;
let sections = [];
let isScrollingTimeout;

function initSections() {
  sections = Array.from(document.querySelectorAll('section'));
  
  // Find which section we're starting on
  const scrollPos = window.scrollY + window.innerHeight / 2;
  sections.forEach((section, index) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
      currentSectionIndex = index;
    }
  });
}

function snapToSection(targetIndex) {
  if (isAnimating || !sections[targetIndex]) return;
  
  const targetSection = sections[targetIndex];
  const targetScroll = targetSection.offsetTop;
  const currentScroll = window.scrollY;
  const distance = Math.abs(targetScroll - currentScroll);
  
  if (distance < 10) {
    currentSectionIndex = targetIndex;
    return;
  }
  
  const duration = Math.min(50, distance * 0.3);
  const startTime = performance.now();
  
  isAnimating = true;
  
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    
    window.scrollTo(0, currentScroll + (targetScroll - currentScroll) * eased);
    
    if (progress < 1 && isAnimating) {
      animationFrame = requestAnimationFrame(animateScroll);
    } else {
      isAnimating = false;
      animationFrame = null;
      currentSectionIndex = targetIndex;
    }
  }
  
  animationFrame = requestAnimationFrame(animateScroll);
}

function cancelAnimation() {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  isAnimating = false;
}

function handleScroll(direction) {
  if (isAnimating) return;
  
  if (direction > 0 && currentSectionIndex < sections.length - 1) {
    // Scroll down
    snapToSection(currentSectionIndex + 1);
  } else if (direction < 0 && currentSectionIndex > 0) {
    // Scroll up
    snapToSection(currentSectionIndex - 1);
  }
}

let lastScrollTime = 0;
let scrollDirection = 0;

window.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  const now = Date.now();
  const timeSinceLastScroll = now - lastScrollTime;
  
  // Debounce wheel events (prevent too many rapid scrolls)
  if (timeSinceLastScroll < 200 || isAnimating) return;
  
  lastScrollTime = now;
  scrollDirection = e.deltaY > 0 ? 1 : -1;
  
  handleScroll(scrollDirection);
}, { passive: false });

// Handle keyboard navigation
window.addEventListener('keydown', (e) => {
  if (isAnimating) return;
  
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
    e.preventDefault();
    handleScroll(1);
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault();
    handleScroll(-1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    snapToSection(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    snapToSection(sections.length - 1);
  }
});

// Handle touch events for mobile
let touchStartY = 0;
let touchEndY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (isAnimating) return;
  
  touchEndY = e.changedTouches[0].clientY;
  const diff = touchStartY - touchEndY;
  
  // Minimum swipe distance
  if (Math.abs(diff) > 50) {
    handleScroll(diff > 0 ? 1 : -1);
  }
}, { passive: true });

// Initialize
initSections();

// Recalculate on resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    initSections();
    snapToSection(currentSectionIndex);
  }, 150);
});

(function () {
  const textarea = document.querySelector('textarea[name="message"]');
  if (!textarea) return;

  // Intercept space key early so it doesn't bubble to page-level handlers that scroll.
  textarea.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.stopPropagation(); // stop it reaching other handlers
      // do NOT call preventDefault() — we want the space character inserted
    }
  }, true); // use capture to catch it early

  // Prevent mouse/touch events from bubbling to any global handlers that might blur or hijack focus
  textarea.addEventListener('mousedown', e => e.stopPropagation(), true);
  textarea.addEventListener('touchstart', e => e.stopPropagation(), true);
})();