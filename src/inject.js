(function () {
  console.log("Worker injection loaded - setting up insights interceptor...");

  let cachedIframe = null;
  let originalMainContent = null;

  function showIframe(
    url = "https://biggifts-staging.vercel.app/admin/quotations",
  ) {
    const mainContent = document.getElementById("main-content");

    if (!mainContent) {
      console.log("main-content element not found");
      return;
    }

    if (!originalMainContent) {
      originalMainContent = mainContent.innerHTML;
    }

    if (!cachedIframe) {
      console.log("Creating new iframe...");
      cachedIframe = document.createElement("iframe");
      cachedIframe.src = url;
      cachedIframe.style.width = "100%";
      cachedIframe.style.height = "100%";
      cachedIframe.style.border = "none";
    }

    mainContent.innerHTML = "";
    mainContent.appendChild(cachedIframe);
    console.log("Iframe displayed (from cache)!");
  }

  function hideIframe() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;

    if (originalMainContent) {
      mainContent.innerHTML = originalMainContent;
      console.log("Original content restored");
    }
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

    const navigation = document.getElementById("navigation");
    if (navigation) {
      navigation.style.width = "";
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
