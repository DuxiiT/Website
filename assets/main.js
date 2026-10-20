/**
 * Aether Studios - Client Application
 * Handles Monochrome (Pure B&W) & Halloween Themes, Loader Copy, Game Carousel & Discord Status
 */

const LOADER_COMMAND = 'loadstring(game:HttpGet("https://getaether.cc/loader.lua"))()';

/**
 * Dynamic Game Discovery & Loader:
 * - Automatically loads games from /assets/Games/ (via window.AETHER_GAMES or directory index)
 * - The game name is automatically taken from the image filename (e.g. "Tower Defense Simulator.webp" -> "Tower Defense Simulator")
 */
function parseGameFilename(filename) {
  if (typeof filename !== "string") return null;
  const base = filename.replace(/^.*[\\\/]/, "").trim();
  if (!base) return null;
  // Strip image extension (.png, .webp, .jpg, .jpeg, .gif, .avif, .svg)
  const cleanName = base.replace(/\.(png|jpe?g|webp|gif|svg|avif)$/i, "").trim();
  return {
    name: cleanName,
    category: "Supported Game",
    image: `./assets/Games/${base}`
  };
}

// GitHub repository & paths candidates for auto-detecting images in /assets/Games/
const GITHUB_REPO_CANDIDATES = [
  "DuxiiT/Core",
  "DuxiiT/Aether",
  "DuxiiT/Website"
];
const GITHUB_PATH_CANDIDATES = [
  "Website/assets/Games",
  "assets/Games",
  "Src/assets/Games"
];

async function fetchGitHubGames() {
  // Check localStorage cache (cache for 10 minutes to avoid GitHub API rate limits)
  try {
    const cached = localStorage.getItem("aether_github_games");
    const cachedTime = localStorage.getItem("aether_github_games_time");
    if (cached && cachedTime && (Date.now() - parseInt(cachedTime, 10) < 10 * 60 * 1000)) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  for (const repo of GITHUB_REPO_CANDIDATES) {
    for (const path of GITHUB_PATH_CANDIDATES) {
      try {
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;
        const res = await fetch(url, { headers: { "Accept": "application/vnd.github.v3+json" } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const imageRegex = /\.(png|webp|jpe?g|gif|svg|avif)$/i;
            const filenames = data
              .filter(item => item.type === "file" && imageRegex.test(item.name))
              .map(item => item.name);

            if (filenames.length > 0) {
              try {
                localStorage.setItem("aether_github_games", JSON.stringify(filenames));
                localStorage.setItem("aether_github_games_time", Date.now().toString());
              } catch (e) {}
              return filenames;
            }
          }
        }
      } catch (e) {}
    }
  }
  return null;
}

function loadManifestGames() {
  const games = [];
  const seen = new Set();

  if (Array.isArray(window.AETHER_GAMES) && window.AETHER_GAMES.length > 0) {
    window.AETHER_GAMES.forEach(fn => {
      if (fn && typeof fn === "string" && !seen.has(fn.toLowerCase())) {
        seen.add(fn.toLowerCase());
        const parsed = parseGameFilename(fn);
        if (parsed) games.push(parsed);
      }
    });
  }
  return games;
}

async function getGamesList() {
  const games = loadManifestGames();
  const seen = new Set(games.map(g => (g.image ? g.image.toLowerCase() : "")));

  // 1. Try static games.json if available
  try {
    const jsonRes = await fetch("./assets/games.json", { cache: "no-cache" });
    if (jsonRes.ok) {
      const list = await jsonRes.json();
      if (Array.isArray(list)) {
        list.forEach(fn => {
          const parsed = parseGameFilename(fn);
          if (parsed && !seen.has(parsed.image.toLowerCase())) {
            seen.add(parsed.image.toLowerCase());
            games.push(parsed);
          }
        });
      }
    }
  } catch (e) {}

  // 2. Try GitHub API auto-discovery (detects any image uploaded to /assets/Games/ on GitHub)
  try {
    const ghFiles = await fetchGitHubGames();
    if (Array.isArray(ghFiles) && ghFiles.length > 0) {
      ghFiles.forEach(fn => {
        const parsed = parseGameFilename(fn);
        if (parsed && !seen.has(parsed.image.toLowerCase())) {
          seen.add(parsed.image.toLowerCase());
          games.push(parsed);
        }
      });
    }
  } catch (e) {}

  // 3. Also try auto-detecting directory contents if running on a local web server (e.g. Live Server)
  try {
    const res = await fetch("./assets/Games/", { cache: "no-cache" });
    if (res.ok) {
      const html = await res.text();
      const regex = /href=["']([^"']+\.(png|webp|jpe?g|gif|svg|avif))["']/gi;
      let m;
      while ((m = regex.exec(html)) !== null) {
        const file = decodeURIComponent(m[1].split(/[/\\]/).pop());
        const parsed = parseGameFilename(file);
        if (parsed && !seen.has(parsed.image.toLowerCase())) {
          seen.add(parsed.image.toLowerCase());
          games.push(parsed);
        }
      }
    }
  } catch (e) {}

  return games;
}

let activeGames = [];
let autoAdvanceTimer = null;

// ==========================================
// 1. Theme Management
// ==========================================
function initTheme() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramTheme = urlParams.get("theme");
  const hashTheme = window.location.hash.toLowerCase().includes("halloween") ? "halloween" : null;
  const saved = localStorage.getItem("aether_theme");

  // Determine initial theme: query param > hash > saved > default
  let theme = "default";
  if (paramTheme === "halloween" || paramTheme === "default") {
    theme = paramTheme;
  } else if (paramTheme === "monochrome") {
    theme = "default";
  } else if (hashTheme) {
    theme = hashTheme;
  } else if (saved === "halloween" || saved === "default") {
    theme = saved;
  }

  applyTheme(theme);

  // Setup click listeners on theme switcher buttons
  document.querySelectorAll("[data-set-theme]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTheme = btn.getAttribute("data-set-theme");
      applyTheme(targetTheme);
    });
  });
}

function applyTheme(theme) {
  if (theme === "monochrome") theme = "default";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("aether_theme", theme);

  // Update switcher button active state
  document.querySelectorAll("[data-set-theme]").forEach(btn => {
    const isCurrent = btn.getAttribute("data-set-theme") === theme;
    btn.classList.toggle("active", isCurrent);
    btn.setAttribute("aria-pressed", isCurrent ? "true" : "false");
  });

  // Update logos
  const logoSrc = theme === "halloween" 
    ? "./assets/Logo-trimmed.png" 
    : "./assets/Logo-monochrome.png";

  document.querySelectorAll(".brand-logo, .footer-logo").forEach(img => {
    img.src = logoSrc;
  });

  // Dynamic hero eyebrow text
  const eyebrow = document.getElementById("heroEyebrow");
  if (eyebrow) {
    if (theme === "halloween") {
      eyebrow.innerHTML = `<span class="eyebrow-dot"></span>🎃 Aether Studios`;
    } else {
      eyebrow.innerHTML = `<span class="eyebrow-dot"></span>Aether Studios`;
    }
  }

  // Dynamic Premium badge - Recommended
  const planTag = document.getElementById("planPremiumTag");
  if (planTag) {
    planTag.textContent = "Recommended";
  }
}

// ==========================================
// 2. Clipboard Copy Functionality
// ==========================================
async function copyLoaderCommand(targetEl) {
  if (!targetEl) return;
  const copyBtn = document.getElementById("terminalCopyBtn");
  const loaderBar = document.getElementById("heroLoaderBar");

  try {
    await navigator.clipboard.writeText(LOADER_COMMAND);
    
    // Animate copy button
    if (copyBtn) {
      copyBtn.classList.add("btn-copied");
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="copy-svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      `;
    }

    if (loaderBar) loaderBar.classList.add("is-copied");

    if (targetEl !== copyBtn && targetEl.tagName === "BUTTON") {
      const orig = targetEl.innerHTML;
      targetEl.classList.add("btn-copied");
      targetEl.innerHTML = `<span>Copied!</span>`;
      setTimeout(() => {
        targetEl.innerHTML = orig;
        targetEl.classList.remove("btn-copied");
      }, 2000);
    }

    setTimeout(() => {
      if (copyBtn) {
        copyBtn.classList.remove("btn-copied");
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="copy-svg" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        `;
      }
      if (loaderBar) loaderBar.classList.remove("is-copied");
    }, 2000);
  } catch (err) {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = LOADER_COMMAND;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      if (copyBtn) {
        copyBtn.classList.add("btn-copied");
        setTimeout(() => copyBtn.classList.remove("btn-copied"), 2000);
      }
    } catch {}
    document.body.removeChild(ta);
  }
}

function initCopyButtons() {
  const ids = ["heroCopyBtn", "freeCopyBtn"];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => copyLoaderCommand(btn));
    }
  });

  const bar = document.getElementById("heroLoaderBar");
  if (bar) {
    bar.addEventListener("click", () => copyLoaderCommand(bar));
  }

  const copyBtn = document.getElementById("terminalCopyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyLoaderCommand(copyBtn);
    });
  }
}

// ==========================================
// Jnkie Key System Flow Integration ("Get Key")
// Docs: https://docs.jnkie.com/
// ==========================================
const JNKIE_CONFIG = {
  endpoint: "https://api.jnkie.com/api/v1/whitelist/getKeyOpen",
  service: "Aether Studios",
  identifier: "1001263",
  provider: "Free Key"
};

function initGetKeyButton() {
  const getKeyBtn = document.getElementById("navGetKeyBtn");
  if (!getKeyBtn) return;

  getKeyBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (getKeyBtn.disabled) return;

    const originalText = getKeyBtn.innerHTML;

    // Set loading state
    getKeyBtn.disabled = true;
    getKeyBtn.innerHTML = `
      <span class="btn-spinner" aria-hidden="true"></span>
      <span>Generating...</span>
    `;

    // Attempt to open a blank tab synchronously within user gesture to prevent popup blockers
    let flowWindow = null;
    try {
      flowWindow = window.open("about:blank", "_blank");
    } catch (err) {
      flowWindow = null;
    }

    try {
      const response = await fetch(JNKIE_CONFIG.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          service: JNKIE_CONFIG.service,
          identifier: JNKIE_CONFIG.identifier,
          provider: JNKIE_CONFIG.provider
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("RATE_LIMITTED");
        }
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const flowUrl = (await response.text()).trim();

      if (flowUrl && (flowUrl.startsWith("http://") || flowUrl.startsWith("https://"))) {
        if (flowWindow && !flowWindow.closed) {
          flowWindow.location.href = flowUrl;
        } else {
          window.open(flowUrl, "_blank", "noopener,noreferrer") || (window.location.href = flowUrl);
        }

        getKeyBtn.innerHTML = `<span>Redirecting...</span>`;
        setTimeout(() => {
          getKeyBtn.innerHTML = originalText;
          getKeyBtn.disabled = false;
        }, 1800);
      } else {
        throw new Error("Invalid flow link received from Jnkie");
      }
    } catch (error) {
      console.error("[Jnkie] Failed to retrieve flow link:", error);

      if (flowWindow && !flowWindow.closed) {
        flowWindow.close();
      }

      const isRateLimit = error.message && error.message.includes("RATE_LIMITTED");
      getKeyBtn.innerHTML = `<span>${isRateLimit ? "Please wait..." : "Error, retry"}</span>`;

      setTimeout(() => {
        getKeyBtn.innerHTML = originalText;
        getKeyBtn.disabled = false;
      }, 2500);
    }
  });
}

// ==========================================
// 3. Games Carousel & Filtering
// ==========================================
function createGameCard(game, index) {
  const card = document.createElement("article");
  card.className = "game-card";
  card.setAttribute("role", "group");
  card.setAttribute("aria-label", `${game.name} - ${game.category}`);

  if (game.image) {
    const img = document.createElement("img");
    img.className = "game-card-img";
    img.src = game.image;
    img.alt = game.name;
    img.loading = index < 4 ? "eager" : "lazy";
    card.appendChild(img);
  } else {
    // Placeholder for newly supported games
    card.classList.add("game-card-placeholder");
    const fallback = document.createElement("div");
    fallback.className = "game-card-fallback";
    fallback.innerHTML = `
      <div class="fallback-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="fallback-icon">
          <rect x="2" y="6" width="20" height="12" rx="4"></rect>
          <path d="M6 12h4m-2-2v4m7-3h.01m3 2h.01"></path>
        </svg>
        <span>NEW SUPPORT</span>
      </div>
    `;
    card.appendChild(fallback);
  }

  const scrim = document.createElement("div");
  scrim.className = "game-card-scrim";

  const info = document.createElement("div");
  info.className = "game-card-info";
  info.innerHTML = `
    <h3 class="game-card-title">${game.name}</h3>
    <span class="game-card-category">${game.category}</span>
  `;

  card.appendChild(scrim);
  card.appendChild(info);
  return card;
}

function renderGamesCarousel() {
  const track = document.getElementById("gameCarousel");
  if (!track) return;

  track.innerHTML = "";
  if (activeGames.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.style.padding = "40px 20px";
    emptyNotice.style.color = "var(--text-muted)";
    emptyNotice.style.fontSize = "0.88rem";
    emptyNotice.textContent = "No games added yet. Add images to /assets/Games/ to display them here!";
    track.appendChild(emptyNotice);
    updateCarouselProgress();
    return;
  }

  activeGames.forEach((g, i) => {
    track.appendChild(createGameCard(g, i));
  });

  updateCarouselProgress();
}

function updateCarouselProgress() {
  const track = document.getElementById("gameCarousel");
  const posEl = document.getElementById("carouselPosition");
  const progEl = document.getElementById("carouselProgress");
  if (!track || !posEl) return;

  const cards = track.querySelectorAll(".game-card");
  if (!cards.length) {
    posEl.textContent = "00 / 00";
    if (progEl) progEl.style.transform = "scaleX(0)";
    return;
  }

  const firstCard = cards[0];
  const cardWidth = firstCard ? (firstCard.getBoundingClientRect().width + 16) : track.clientWidth;
  const currentIndex = Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / cardWidth)));
  
  posEl.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  if (progEl) {
    progEl.style.transform = `scaleX(${(currentIndex + 1) / cards.length})`;
  }
}

function scrollCarousel(direction) {
  const track = document.getElementById("gameCarousel");
  if (!track) return;

  const cards = track.querySelectorAll(".game-card");
  if (!cards.length) return;

  const cardWidth = cards[0].getBoundingClientRect().width + 16;
  const maxScroll = track.scrollWidth - track.clientWidth;
  
  if (direction === 1 && track.scrollLeft >= maxScroll - 10) {
    track.scrollTo({ left: 0, behavior: "smooth" });
  } else if (direction === -1 && track.scrollLeft <= 10) {
    track.scrollTo({ left: maxScroll, behavior: "smooth" });
  } else {
    track.scrollBy({ left: cardWidth * direction, behavior: "smooth" });
  }
}

function initCarouselControls() {
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  const track = document.getElementById("gameCarousel");

  if (prevBtn) prevBtn.addEventListener("click", () => scrollCarousel(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => scrollCarousel(1));

  if (track) {
    track.addEventListener("scroll", updateCarouselProgress, { passive: true });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollCarousel(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollCarousel(1);
      }
    });

    // Auto advance when there are multiple cards and not hovered
    let isHovered = false;
    track.addEventListener("pointerenter", () => { isHovered = true; });
    track.addEventListener("pointerleave", () => { isHovered = false; });

    if (autoAdvanceTimer) clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = window.setInterval(() => {
      if (activeGames.length > 1 && !isHovered && !document.hidden) {
        scrollCarousel(1);
      }
    }, 3800);
  }
}

// ==========================================
// 4. Live Discord Widget Integration
// ==========================================
async function initDiscordWidget() {
  const API_URL = "https://discord.com/api/guilds/1453469070534905969/widget.json";
  const onlineEl = document.getElementById("onlineCount");
  const serverEl = document.getElementById("serverName");
  const stackEl = document.getElementById("avatarStack");
  const inviteEl = document.getElementById("discordInvite");
  const statusEl = document.getElementById("widgetStatus");

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.name && serverEl) {
      serverEl.textContent = data.name;
    }
    if (data.presence_count !== undefined && onlineEl) {
      onlineEl.textContent = `${data.presence_count.toLocaleString()} online`;
    }
    if (data.instant_invite && inviteEl) {
      inviteEl.href = data.instant_invite;
    }
    if (statusEl) {
      statusEl.textContent = "Live";
      statusEl.classList.add("is-live");
    }

    if (data.members && data.members.length && stackEl) {
      stackEl.innerHTML = "";
      data.members.slice(0, 4).forEach(m => {
        const img = document.createElement("img");
        img.className = "member-avatar";
        img.src = m.avatar_url;
        img.alt = m.username || "Member";
        img.loading = "lazy";
        stackEl.appendChild(img);
      });
    }
  } catch (err) {
    if (onlineEl) onlineEl.textContent = "Community active";
    if (statusEl) statusEl.textContent = "Operational";
  }
}

// ==========================================
// 5. Header Scroll & Mobile Nav
// ==========================================
function initHeaderScroll() {
  const header = document.getElementById("siteHeader");
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const sections = navLinks.map(l => document.querySelector(l.hash)).filter(s => s !== null);

  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY > 20;
    if (header) header.classList.toggle("scrolled", scrolled);

    // Active link highlighting
    let currentId = "";
    sections.forEach(sec => {
      if (sec.getBoundingClientRect().top <= 140) {
        currentId = sec.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle("active", link.hash === `#${currentId}`);
    });
  }, { passive: true });
}

// ==========================================
// 6. Reveal Animations
// ==========================================
function initScrollObserver() {
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}

// ==========================================
// Initialization
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initCopyButtons();
  initGetKeyButton();
  
  // 1. Instant load from games-list.js manifest
  activeGames = loadManifestGames();
  renderGamesCarousel();
  initCarouselControls();
  initDiscordWidget();
  initHeaderScroll();
  initScrollObserver();

  // 2. Background check if new files can be detected via server directory index
  try {
    const fetched = await getGamesList();
    if (fetched.length > 0 && fetched.length !== activeGames.length) {
      activeGames = fetched;
      renderGamesCarousel();
    }
  } catch (e) {}
});
