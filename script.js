document.addEventListener('DOMContentLoaded', function () {

  // ─── Dark mode ──────────────────────────────────────────────
  const darkModeToggle = document.getElementById('darkModeToggle');
  const darkPref = localStorage.getItem('dark');
  if (darkPref === null ? matchMedia('(prefers-color-scheme: dark)').matches : darkPref === '1') {
    document.body.classList.add('dark-mode');
  }
  darkModeToggle.addEventListener('click', function () {
    localStorage.setItem('dark', document.body.classList.toggle('dark-mode') ? '1' : '0');
  });

  // ─── Navigation helpers ──────────────────────────────────────
  const carouselContainer = document.getElementById('carouselContainer');
  const defaultMenu = document.getElementById('defaultMenu');
  const contentDiv = document.getElementById('content');

  function showSection(html) {
    carouselContainer.style.display = 'none';
    defaultMenu.style.display = 'flex';
    contentDiv.innerHTML = html;
    // Re-trigger fade animation
    contentDiv.style.animation = 'none';
    contentDiv.offsetHeight; // reflow
    contentDiv.style.animation = '';
  }

  function showHome() {
    carouselContainer.style.display = '';
    defaultMenu.style.display = 'none';
    createCarousel(); // re-measure: width was 0 while hidden
    fetch('homeContent.html')
      .then((r) => r.text())
      .then((html) => { contentDiv.innerHTML = html; })
      .catch(() => { contentDiv.innerHTML = ''; }); // e.g. file:// has no fetch
  }

  // ─── Section content ─────────────────────────────────────────

  function contentCreationHTML() {
    return `
      <div class="content-section">
        <h1>Content Creation</h1>
        <p class="section-sub">YouTube &bull; Gaming &bull; Tech</p>
        <p>I create gaming and tech content on YouTube. Check out my latest video below, and subscribe if you want to follow along!</p>
        <div class="video-embed">
          <iframe
            src="https://www.youtube.com/embed/Fy9UYGzPVG8"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
        <p>More content coming soon. Stay tuned!</p>
      </div>
    `;
  }

  function hardwareHTML() {
    return `
      <div class="content-section">
        <h1>Hardware</h1>
        <p class="section-sub">My PC setup and ongoing builds</p>

        <h2>PC Setup</h2>
        <ul class="hw-list">
          <li><span class="hw-label">Case</span> <a href="https://amzn.eu/d/4hkrHid">Cooler Master MasterBox TD500 Mesh</a></li>
          <li><span class="hw-label">CPU</span> <a href="https://amzn.eu/d/9HwxtbE">Intel&reg; Core™ i5-13600K</a></li>
          <li><span class="hw-label">GPU</span> <a href="https://amzn.eu/d/5oOMUjF">AMD RX 6800XT</a></li>
          <li><span class="hw-label">RAM</span> <a href="https://amzn.eu/d/4JcwcsO">G.Skill F4-3200C16D-32GVK (2 &times; 16 GB)</a></li>
          <li><span class="hw-label">Motherboard</span> <a href="https://amzn.eu/d/b3DLYPB">Gigabyte Z690 UD DDR4</a></li>
          <li><span class="hw-label">OS</span> <a href="https://www.microsoft.com/de-de/d/windows-11-pro/dg7gmgf0d8h4/000P">Windows 11 Pro (64-bit)</a></li>
          <li><span class="hw-label">Mouse</span> <a href="https://amzn.eu/d/deVYJgk">Logitech G305</a></li>
          <li><span class="hw-label">Keyboard</span> <a href="https://amzn.eu/d/3x2ZswV">HyperX Alloy Origins 60 (HyperX Red, US layout)</a></li>
          <li><span class="hw-label">Mousepad</span> <a href="https://www.amazon.com/SteelSeries-QcK-Gaming-Mouse-Black/dp/B000UVRU6G/">SteelSeries QcK+</a></li>
          <li><span class="hw-label">Monitor 1</span> <a href="https://amzn.eu/d/aVYspWD">AOC Q27G2U — 27&rdquo; QHD 144 Hz 1ms</a></li>
          <li><span class="hw-label">Monitor 2</span> <a href="https://a.co/d/9RJIAvi">BenQ GL2450 — 24&rdquo; 60 Hz</a></li>
          <li><span class="hw-label">Monitor 3</span> Lenovo ThinkVision (vertical)</li>
        </ul>

        <h3>Audio</h3>
        <ul class="hw-list">
          <li><span class="hw-label">Headphones</span> <a href="https://amzn.eu/d/6Mxrhpq">beyerdynamic DT 880 Black Special Edition</a></li>
          <li><span class="hw-label">Microphone</span> <a href="https://www.amazon.de/gp/product/B00WGAT56W/">Shure PGA48 XLR</a></li>
          <li><span class="hw-label">Audio Interface</span> <a href="https://www.amazon.de/gp/product/B00FFIGZF66/">Behringer U-PHORIA UMC22</a></li>
        </ul>

        <h3>VR</h3>
        <ul class="hw-list">
          <li><span class="hw-label">Headset</span> Meta Quest 2</li>
        </ul>

        <h2>NAS Build <span style="font-size:0.75rem; color: rgba(255,255,255,0.3); font-weight:400;">(work in progress)</span></h2>
        <p>A Network-Attached Storage project currently in progress. The chassis is built and the system is ready for three 12&thinsp;TB drives.</p>
        <ul class="hw-list">
          <li><span class="hw-label">Case</span> TBD</li>
          <li><span class="hw-label">PSU</span> TBD</li>
          <li><span class="hw-label">Motherboard</span> TBD</li>
          <li><span class="hw-label">CPU</span> TBD</li>
          <li><span class="hw-label">RAM</span> TBD</li>
          <li><span class="hw-label">Storage</span> 3 &times; 12 TB HDD (ordered)</li>
        </ul>
      </div>
    `;
  }

  function blogHTML() {
    return `
      <div class="content-section">
        <h1>Blog</h1>
        <p class="section-sub">Personal updates &bull; Projects &bull; Thoughts</p>

        <div class="blog-post">
          <p class="blog-date">13 October 2024</p>
          <p>Added the Content Creation page to showcase my YouTube work. My NAS project is also making good progress — the chassis is finished and the system is staged for three 12&thinsp;TB drives that are on order.</p>
        </div>

        <div class="blog-post">
          <p class="blog-date">8 October 2024</p>
          <p>The site is pretty bare right now, but that will change. As I get more comfortable with HTML/CSS/JS the design will grow with it. Think of this as version 0.1.</p>
        </div>

        <div class="blog-post">
          <p class="blog-date">7 October 2024</p>
          <p>Welcome to my personal blog. I'll be dumping thoughts, project updates, and whatever else seems worth writing down here. Bookmark it if you want to follow along.</p>
        </div>
      </div>
    `;
  }

  // ─── Menu button handlers ────────────────────────────────────

  document.getElementById('homeButtonMenu').addEventListener('click', showHome);

  document.getElementById('subMenuButtonMenu').addEventListener('click', function () {
    showSection(contentCreationHTML());
  });

  document.getElementById('hardwareButtonMenu').addEventListener('click', function () {
    showSection(hardwareHTML());
  });

  document.getElementById('blogButtonMenu').addEventListener('click', function () {
    showSection(blogHTML());
  });

  // ─── Carousel item click handlers ───────────────────────────

  document.getElementById('homeButtonCarousel').addEventListener('click', function (e) {
    e.preventDefault();
    // Already on home — do nothing
  });

  document.getElementById('subMenuButtonCarousel').addEventListener('click', function (e) {
    e.preventDefault();
    showSection(contentCreationHTML());
  });

  document.getElementById('hardwareButtonCarousel').addEventListener('click', function (e) {
    e.preventDefault();
    showSection(hardwareHTML());
  });

  document.getElementById('blogButtonCarousel').addEventListener('click', function (e) {
    e.preventDefault();
    showSection(blogHTML());
  });

  // ─── 3D Carousel logic ───────────────────────────────────────

  const container = document.querySelector('.container');
  const containercarrossel = container.querySelector('.container-carrossel');
  const carrossel = container.querySelector('.carrossel');
  const carrosselItems = carrossel.querySelectorAll('.carrossel-item');

  let isMouseDown = false;
  let lastMousePos = 0;
  let lastMoveTo = 0;
  let moveTo = 0;

  const lerp = (a, b, n) => (1 - n) * a + n * b;

  const distanceZ = (widthElement, length, gap) =>
    widthElement / 2 / Math.tan(Math.PI / length) + gap;

  const calculateHeight = (z) => {
    const t = Math.atan((90 * Math.PI) / 180 / 2);
    return t * 2 * z;
  };

  const createCarousel = () => {
    const bounds = containercarrossel.getBoundingClientRect();
    const length = carrosselItems.length;
    const degrees = 360 / length;
    const gap = 20;
    const tz = distanceZ(bounds.width, length, gap);
    const height = calculateHeight(tz);

    container.style.width = tz * 2 + gap * length + 'px';
    container.style.height = height + 'px';

    carrosselItems.forEach((item, i) => {
      item.style.setProperty('--rotatey', degrees * i + 'deg');
      item.style.setProperty('--tz', tz + 'px');
    });
  };

  const getPosX = (x) => {
    moveTo = x < lastMousePos ? moveTo - 2 : moveTo + 2;
    lastMousePos = x;
  };

  const update = () => {
    lastMoveTo = lerp(lastMoveTo, moveTo, 0.1);
    carrossel.style.setProperty('--rotatey', lastMoveTo + 'deg');
    requestAnimationFrame(update);
  };

  carrossel.addEventListener('mousedown', () => {
    isMouseDown = true;
    carrossel.style.cursor = 'grabbing';
  });
  carrossel.addEventListener('mouseup', () => {
    isMouseDown = false;
    carrossel.style.cursor = 'grab';
  });
  container.addEventListener('mouseleave', () => (isMouseDown = false));
  carrossel.addEventListener('mousemove', (e) => {
    if (isMouseDown) getPosX(e.clientX);
  });
  carrossel.addEventListener('touchstart', () => {
    isMouseDown = true;
  });
  carrossel.addEventListener('touchend', () => {
    isMouseDown = false;
  });
  container.addEventListener('touchmove', (e) => {
    if (isMouseDown) getPosX(e.touches[0].clientX);
  });
  window.addEventListener('resize', () => {
    if (carouselContainer.style.display !== 'none') createCarousel();
  });

  update();
  showHome();
});
