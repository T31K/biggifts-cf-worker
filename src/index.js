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
    setTimeout(() => {
      document.title = "Quotations";
    }, 1000);
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

  // Deduplicate category names in product table rows
  function deduplicateCategoryNames() {
    console.log("Deduplicating category names...");
    if (!window.location.pathname.startsWith("/admin/content/products")) return;

    const rows = document.querySelectorAll("tr.table-row");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td.cell");
      if (cells.length < 4) return;
      const categoryCell = cells[3];
      const valueEl = categoryCell.querySelector(".value");
      if (!valueEl) return;
      const text = valueEl.textContent.trim();
      if (!text || !text.includes(",")) return;
      const parts = text.split(",").map((s) => s.trim()).filter(Boolean);
      const unique = [...new Set(parts)];
      if (unique.length < parts.length) {
        valueEl.textContent = unique.join(", ");
      }
    });
  }

  function addCopyIframe(uuid) {
    const field = document.querySelector("[data-field='copy_iframe']");
    if (!field) return;

    const existing = field.querySelector(".cf-injected-iframe");
    const newSrc = "https://biggifts-staging.vercel.app/admin/product/" + uuid;
    if (existing) {
      if (existing.src === newSrc) return;
      existing.remove();
    }

    field.style.position = "relative";
    field.style.minHeight = "80dvh";

    const iframe = document.createElement("iframe");
    iframe.src = newSrc;
    iframe.className = "cf-injected-iframe";
    iframe.style.position = "absolute";
    iframe.style.inset = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "3";
    iframe.style.background = "white";

    field.appendChild(iframe);
  }

  let lastCategoryPath = null;

  const categoryObserver = new MutationObserver(() => {
    const path = window.location.pathname;
    if (path === lastCategoryPath) return;
    lastCategoryPath = path;

    if (path.length > "/admin/content/products".length && path.startsWith("/admin/content/products")) {
      const uuid = path.split("/admin/content/products/")[1];
      addCopyIframe(uuid);
    } else if (path.startsWith("/admin/content/products")) {
      deduplicateCategoryNames();
    }
  });

  setTimeout(() => {
    categoryObserver.observe(document.body, { childList: true, subtree: true });
  }, 2500);

})();
`;

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
