/**
 * ===================================================================
 * AETHER STUDIOS - EVENTS & PROMOTIONS CONFIGURATION
 * ===================================================================
 * Easily manage special events, holiday discounts, and coupon codes here.
 * Any edits made here will automatically reflect across the entire website!
 *
 * HOW TO USE:
 * -------------------------------------------------------------------
 * - To turn the event ON:  set enabled: true
 * - To turn the event OFF: set enabled: false
 * - Edit the badge, message, discount code, and link below.
 * - Visitors can click the coupon code pill to copy it with 1-click!
 * ===================================================================
 */

window.AETHER_EVENT_CONFIG = {
  // Set to true to display the event banner, or false to hide it
  enabled: true,

  // Event badge label shown on the banner (e.g. "🎃 HALLOWEEN SALE", "⚡ FLASH SALE", "✦ LIMITED OFFER")
  badge: "🎃 HALLOWEEN SALE",

  // Main announcement message
  message: "Discount for halloween! Use code",

  // Discount / coupon code (shows as a clickable 1-click copy badge).
  // If you don't have a code, set this to "" or null
  code: "HALLOWEEN2026",

  // Percentage or discount value text
  discountText: "for 20% off at checkout!",

  // Call-to-action button
  ctaText: "Claim 20% Off →",
  ctaLink: "usd.html", // Or your direct SellAuth link e.g. "https://getaether.mysellauth.com/"
  ctaTarget: "_self",  // "_self" to open in same tab, or "_blank" for new tab

  // Banner theme styling:
  // "auto"      -> Matches the current site theme (Halloween orange or Default silver/yellow)
  // "halloween" -> Forces Halloween pumpkin orange colors
  // "yellow"    -> Forces Aether Premium light yellow colors
  theme: "auto",

  // Allow visitors to close the banner for their current browser session
  dismissible: false
};

/**
 * Renders and handles the Aether Event Banner across pages.
 */
function initAetherEventBanner() {
  const config = window.AETHER_EVENT_CONFIG;
  if (!config || !config.enabled) {
    const existing = document.getElementById("aetherEventBanner");
    if (existing) existing.style.display = "none";
    return;
  }

  // Update checkout promo callout if on usd.html
  renderCheckoutPromoCallout(config);

  // Look for top banner container (only render top banner if #aetherEventBanner exists on the page)
  const banner = document.getElementById("aetherEventBanner");
  if (!banner) {
    return;
  }

  // Check if previously dismissed in this session
  if (config.dismissible && sessionStorage.getItem("aether_event_dismissed") === "true") {
    banner.style.display = "none";
    return;
  }

  banner.className = `event-banner event-theme-${config.theme || "auto"}`;
  banner.style.display = "block";

  const codeHtml = config.code ? `
    <button class="event-code-pill" id="eventCodeCopyBtn" type="button" title="Click to copy code">
      <span class="event-code-text">${config.code}</span>
      <svg class="event-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="event-copied-tooltip" id="eventCopiedTooltip">Copied!</span>
    </button>
  ` : "";

  const ctaHtml = (config.ctaText && config.ctaLink) ? `
    <a class="event-cta-btn" href="${config.ctaLink}" target="${config.ctaTarget || "_self"}">
      ${config.ctaText}
    </a>
  ` : "";

  const dismissHtml = config.dismissible ? `
    <button class="event-dismiss-btn" id="eventDismissBtn" type="button" aria-label="Dismiss announcement">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  ` : "";

  banner.innerHTML = `
    <div class="event-banner-shell">
      <div class="event-content-row">
        ${config.badge ? `<span class="event-badge">${config.badge}</span>` : ""}
        <span class="event-message">
          ${config.message}
          ${codeHtml}
          ${config.discountText ? `<span class="event-discount-text">${config.discountText}</span>` : ""}
        </span>
      </div>
      <div class="event-actions-row">
        ${ctaHtml}
        ${dismissHtml}
      </div>
    </div>
  `;

  // 1-Click Copy Interaction
  if (config.code) {
    const copyBtn = document.getElementById("eventCodeCopyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(config.code);
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.classList.remove("copied");
          }, 2000);
        } catch (err) {
          // Fallback copy
          const textarea = document.createElement("textarea");
          textarea.value = config.code;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          copyBtn.classList.add("copied");
          setTimeout(() => copyBtn.classList.remove("copied"), 2000);
        }
      });
    }
  }

  // Dismiss button interaction
  if (config.dismissible) {
    const dismissBtn = document.getElementById("eventDismissBtn");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", () => {
        banner.style.display = "none";
        sessionStorage.setItem("aether_event_dismissed", "true");
      });
    }
  }
}

/**
 * On usd.html, displays an active discount box right above the checkout button.
 */
function renderCheckoutPromoCallout(config) {
  const container = document.getElementById("checkoutPromoContainer");
  if (!container || !config || !config.enabled || !config.code) return;

  container.innerHTML = `
    <div class="checkout-promo-box">
      <div class="checkout-promo-icon">🏷️</div>
      <div class="checkout-promo-details">
        <div class="checkout-promo-title">Active Discount Code Available</div>
        <div class="checkout-promo-desc">
          Apply code 
          <button class="checkout-code-pill" id="checkoutCodeCopyBtn" type="button" title="Click to copy">
            <strong>${config.code}</strong>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copied-badge" id="checkoutCopiedBadge">Copied!</span>
          </button> 
          at SellAuth checkout to claim your discount!
        </div>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("checkoutCodeCopyBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(config.code);
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 2000);
      } catch (err) {
        copyBtn.classList.add("copied");
        setTimeout(() => copyBtn.classList.remove("copied"), 2000);
      }
    });
  }
}

// Auto-run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAetherEventBanner);
} else {
  initAetherEventBanner();
}
