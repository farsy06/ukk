(() => {
  const ACTIVE_CLASS = "active";
  const SCROLLED_CLASS = "scrolled";
  const ADMIN_MODE_CLASS = "admin-mode";
  const NAVBAR_COLLAPSE_SELECTOR = "#navbarNav";

  const bootstrapApi = window.bootstrap || null;

  const normalizePath = (value) => {
    if (!value || typeof value !== "string") return "/";
    const withoutQuery = value.split("?")[0].split("#")[0];
    const trimmed = withoutQuery.replace(/\/+$/, "");
    return trimmed || "/";
  };

  const getTheme = () =>
    document.documentElement.getAttribute("data-bs-theme") || "light";

  const setTheme = (theme) => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
  };

  const toggleTheme = () => {
    const nextTheme = getTheme() === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const initThemeToggles = () => {
    const toggles = document.querySelectorAll(".theme-toggle");
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", toggleTheme);
    });
  };

  const initTooltips = () => {
    if (!bootstrapApi || !bootstrapApi.Tooltip) return;

    const tooltipElements = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    tooltipElements.forEach((element) => {
      bootstrapApi.Tooltip.getOrCreateInstance(element);
    });
  };

  const initHeaderScrollState = () => {
    const navbar = document.querySelector(".navbar");
    if (!navbar) return;

    const syncScrollClass = () => {
      navbar.classList.toggle(SCROLLED_CLASS, window.scrollY > 50);
    };

    syncScrollClass();
    window.addEventListener("scroll", syncScrollClass, { passive: true });
  };

  const syncHeaderMetrics = () => {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const measuredHeight = Math.ceil(header.getBoundingClientRect().height);
    const minHeight = 76;
    const finalHeight = Math.max(measuredHeight, minHeight);
    document.documentElement.style.setProperty(
      "--header-height",
      `${finalHeight}px`,
    );
  };

  const resolvePathFromHref = (href) => {
    if (!href || href === "#") return null;

    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  };

  const initActiveNavState = () => {
    const currentPath = normalizePath(window.location.pathname);
    const navLinks = document.querySelectorAll(".navbar .nav-link[href]");

    navLinks.forEach((link) => {
      const linkPath = resolvePathFromHref(link.getAttribute("href"));
      if (!linkPath) return;

      const isExactMatch = linkPath === currentPath;
      const isNestedMatch =
        linkPath !== "/" && currentPath.startsWith(`${linkPath}/`);

      link.classList.toggle(ACTIVE_CLASS, isExactMatch || isNestedMatch);
    });

    const dropdownItems = document.querySelectorAll(".dropdown-item[href]");
    dropdownItems.forEach((item) => {
      const itemPath = resolvePathFromHref(item.getAttribute("href"));
      const isActive = itemPath === currentPath;
      item.classList.toggle(ACTIVE_CLASS, Boolean(isActive));

      if (!isActive) return;
      const dropdown = item.closest(".dropdown");
      const toggle = dropdown ? dropdown.querySelector(".nav-link") : null;
      if (toggle) toggle.classList.add(ACTIVE_CLASS);
    });
  };

  const initNavbarCollapseBehavior = () => {
    if (!bootstrapApi || !bootstrapApi.Collapse) return;

    const collapseElement = document.querySelector(NAVBAR_COLLAPSE_SELECTOR);
    if (!collapseElement) return;

    const collapseInstance = bootstrapApi.Collapse.getOrCreateInstance(
      collapseElement,
      {
        toggle: false,
      },
    );

    const clickTargets = document.querySelectorAll(
      `${NAVBAR_COLLAPSE_SELECTOR} .nav-link, ${NAVBAR_COLLAPSE_SELECTOR} .dropdown-item`,
    );

    clickTargets.forEach((target) => {
      target.addEventListener("click", () => {
        const href = target.getAttribute("href");
        const isDropdownToggle =
          target.getAttribute("data-bs-toggle") === "dropdown";
        if (isDropdownToggle || href === "#") return;

        const togglerElement = document.querySelector(".navbar-toggler");
        const isTogglerVisible =
          togglerElement &&
          window.getComputedStyle(togglerElement).display !== "none";

        if (isTogglerVisible && collapseElement.classList.contains("show")) {
          collapseInstance.hide();
        }
      });
    });

    collapseElement.addEventListener("shown.bs.collapse", syncHeaderMetrics);
    collapseElement.addEventListener("hidden.bs.collapse", syncHeaderMetrics);
  };

  const sanitizeActionPath = (href) => {
    if (!href || href === "#") return "#";

    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return "#";
      if (!url.pathname.startsWith("/")) return "#";
      return `${url.pathname}${url.search}`;
    } catch {
      return "#";
    }
  };

  const setButtonContent = (button, iconClass, label) => {
    button.innerHTML = "";

    if (iconClass) {
      const icon = document.createElement("i");
      icon.className = iconClass;
      button.appendChild(icon);
      button.appendChild(document.createTextNode(" "));
    }

    button.appendChild(document.createTextNode(label));
  };

  const setButtonVariant = (button, buttonClass) => {
    button.classList.remove("btn-danger", "btn-warning", "btn-success");
    button.classList.add(buttonClass || "btn-danger");
  };

  const initConfirmModal = () => {
    const confirmDeleteForm = document.getElementById("confirmDeleteForm");
    const confirmDeleteButton = document.getElementById("confirmDeleteButton");
    const confirmDeleteMessage = document.getElementById(
      "confirmDeleteMessage",
    );
    const confirmDeleteLabel = document.getElementById("confirmDeleteLabel");

    if (!confirmDeleteForm || !confirmDeleteButton) return;

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-confirm-href]");
      if (!trigger) return;

      const href = trigger.getAttribute("data-confirm-href") || "#";
      const title =
        trigger.getAttribute("data-confirm-title") || "Konfirmasi Hapus";
      const message =
        trigger.getAttribute("data-confirm-message") ||
        "Yakin ingin menghapus item ini?";
      const label = trigger.getAttribute("data-confirm-label") || "Hapus";
      const icon = trigger.getAttribute("data-confirm-icon") || "fas fa-trash";
      const buttonClass =
        trigger.getAttribute("data-confirm-button-class") || "btn-danger";

      if (confirmDeleteLabel) confirmDeleteLabel.textContent = title;
      if (confirmDeleteMessage) confirmDeleteMessage.textContent = message;

      confirmDeleteForm.setAttribute("action", sanitizeActionPath(href));
      confirmDeleteButton.classList.remove("disabled");
      setButtonVariant(confirmDeleteButton, buttonClass);
      setButtonContent(confirmDeleteButton, icon, label);
    });

    confirmDeleteForm.addEventListener("submit", () => {
      const label = confirmDeleteButton.textContent.trim() || "Hapus";
      setButtonContent(
        confirmDeleteButton,
        "fas fa-spinner fa-spin",
        "Memproses...",
      );
      confirmDeleteButton.classList.add("disabled");

      setTimeout(() => {
        setButtonContent(confirmDeleteButton, "fas fa-trash", label);
        confirmDeleteButton.classList.remove("disabled");
      }, 1800);
    });
  };

  const initPageMode = () => {
    const currentPath = normalizePath(window.location.pathname);
    document.body.classList.toggle(
      ADMIN_MODE_CLASS,
      currentPath === "/admin" || currentPath.startsWith("/admin/"),
    );
  };

  document.addEventListener("DOMContentLoaded", () => {
    syncHeaderMetrics();
    initPageMode();
    initThemeToggles();
    initTooltips();
    initHeaderScrollState();
    initActiveNavState();
    initNavbarCollapseBehavior();
    initConfirmModal();

    window.addEventListener("resize", syncHeaderMetrics, { passive: true });
  });
})();
