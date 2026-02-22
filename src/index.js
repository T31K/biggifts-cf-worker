const INJECT_SCRIPT = `
(function () {
  console.log("Worker injection loaded - setting up insights interceptor...");

  let cachedIframe = null;
  let originalMainContent = null;

  function showIframe(url = "https://biggifts-staging.vercel.app/admin/quotations") {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    if (!originalMainContent) {
      originalMainContent = mainContent.innerHTML;
    }

    if (!cachedIframe) {
      cachedIframe = document.createElement("iframe");
      cachedIframe.src = url;
      cachedIframe.style.width = "100%";
      cachedIframe.style.height = "100%";
      cachedIframe.style.border = "none";
    }

    mainContent.innerHTML = "";
    mainContent.appendChild(cachedIframe);
  }

  function hideSidebar() {
    const sidebar = document.querySelector(".resize-wrapper.transition");
    if (sidebar) {
      sidebar.style.display = "none";
      sidebar.style.pointerEvents = "none";
    }

    const rightBar = document.getElementById("sidebar");
    if (rightBar) {
      rightBar.style.display = "none";
    }
  }

  function showSidebar() {
    const sidebar = document.querySelector(".resize-wrapper.transition");
    if (sidebar) {
      sidebar.style.display = "";
      sidebar.style.pointerEvents = "auto";
    }

    const rightBar = document.getElementById("sidebar");
    if (rightBar) {
      rightBar.style.display = "";
    }
  }

  function checkAndApplySettings() {
    const currentPath = window.location.pathname;

    if (currentPath === "/admin/quotations") {
      hideSidebar();

      const mainContent = document.getElementById("main-content");
      if (mainContent && !mainContent.querySelector("iframe")) {
        showIframe();
      }
    } else {
      showSidebar();
    }
  }

  let lastPath = window.location.pathname;

  const observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkAndApplySettings();
    }
  });

  setTimeout(() => {
    checkAndApplySettings();

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        checkAndApplySettings();
      }
    }, 500);
  }, 2000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      setTimeout(checkAndApplySettings, 100);
    }
  });

  function handleProductsPage() {
    const path = window.location.pathname;
    if (!path.startsWith("/admin/content/products")) return;

    const uuid = path.split("/admin/content/products/")[1];

    if (uuid) {
      // Detail page - inject iframe
      const anchors = document.querySelectorAll(".presentation-links a");
      for (const anchor of anchors) {
        if (!anchor.textContent.includes("Fetch or Copy Product Details")) continue;
        const href = anchor.getAttribute("href");
        if (!href) continue;
        const container = anchor.closest(".presentation-links");
        if (!container || container.querySelector(".cf-product-iframe")) continue;
        container.style.pointerEvents = "none";
        container.style.opacity = "0.5";
        const iframe = document.createElement("iframe");
        iframe.className = "cf-product-iframe";
        iframe.src = href;
        iframe.style.cssText = "width:100%;height:800px;border:none;margin-top:16px;border-radius:8px;display:block;";
        container.insertAdjacentElement("afterend", iframe);
        break;
      }
    } else {
      // List page - deduplicate category names
      const rows = document.querySelectorAll("tr.table-row");
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td.cell");
        if (cells.length < 4) return;
        const valueEl = cells[3].querySelector(".value");
        if (!valueEl) return;
        const text = valueEl.textContent.trim();
        if (!text || !text.includes(",")) return;
        const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
        const unique = [...new Set(parts)];
        if (unique.length < parts.length) valueEl.textContent = unique.join(", ");
      });
    }
  }

  const pageObserver = new MutationObserver(() => handleProductsPage());

  setTimeout(() => {
    handleProductsPage();
    pageObserver.observe(document.body, { childList: true, subtree: true });
  }, 2500);

})();
`;

const INJECT_HEADERS = {
  headers: { "content-type": "application/javascript" },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve injected JS
    if (url.pathname === "/cf-inject.js") {
      return new Response(INJECT_SCRIPT, {
        headers: {
          "content-type": "application/javascript",
        },
      });
    }

    // Fetch original response
    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    // Clone headers
    const newHeaders = new Headers(response.headers);

    // Override CSP to allow iframe domain
    newHeaders.set(
      "Content-Security-Policy",
      "script-src 'self' 'unsafe-eval'; frame-src 'self' https://biggifts-staging.vercel.app; child-src 'self' https://biggifts-staging.vercel.app; object-src 'none'; base-uri 'self';",
    );

    // Inject script tag
    const modifiedResponse = new HTMLRewriter()
      .on("body", {
        element(el) {
          el.append(`<script src="/cf-inject.js" defer></script>`, {
            html: true,
          });
        },
      })
      .transform(response);

    return new Response(modifiedResponse.body, {
      status: modifiedResponse.status,
      headers: newHeaders,
    });
  },
};
