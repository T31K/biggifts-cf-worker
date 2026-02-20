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

    if (currentPath === "/admin/insights") {
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

})();
`;

const INJECT_HEADERS = {
  headers: { "content-type": "application/javascript" },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve injected JS from Worker itself
    if (url.pathname === "/cf-inject.js")
      return new Response(INJECT_SCRIPT, INJECT_HEADERS);

    // Normal page request
    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    return new HTMLRewriter()
      .on("body", {
        element(el) {
          el.append(`<script src="/cf-inject.js" defer></script>`, {
            html: true,
          });
        },
      })
      .transform(response);
  },
};
