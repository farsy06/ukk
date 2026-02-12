(() => {
  const themeToggles = document.querySelectorAll(".theme-toggle");
  const html = document.documentElement;

  themeToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const currentTheme = html.getAttribute("data-bs-theme") || "light";
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  document.body.classList.toggle(
    "admin-mode",
    currentPath === "/admin" || currentPath.startsWith("/admin/"),
  );

  const tooltipElements = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]'),
  );
  // eslint-disable-next-line no-undef
  tooltipElements.forEach((el) => new bootstrap.Tooltip(el));

  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", () => {
    if (!navbar) return;
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

  const navLinks = document.querySelectorAll(".nav-link[href]");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    if (href === currentPath) {
      link.classList.add("active");
      return;
    }
    if (href !== "/" && currentPath.startsWith(`${href}/`)) {
      link.classList.add("active");
    }
  });

  const confirmDeleteModal = document.getElementById("confirmDeleteModal");
  const confirmDeleteMessage = document.getElementById("confirmDeleteMessage");
  const confirmDeleteForm = document.getElementById("confirmDeleteForm");
  const confirmDeleteButton = document.getElementById("confirmDeleteButton");
  const confirmDeleteLabel = document.getElementById("confirmDeleteLabel");

  if (!confirmDeleteModal || !confirmDeleteForm || !confirmDeleteButton) return;

  const setButtonContent = (button, iconClass, label) => {
    while (button.firstChild) {
      button.removeChild(button.firstChild);
    }
    if (iconClass) {
      const icon = document.createElement("i");
      icon.className = iconClass;
      button.appendChild(icon);
      button.appendChild(document.createTextNode(" "));
    }
    button.appendChild(document.createTextNode(label));
  };

  const setButtonClass = (button, buttonClass) => {
    button.classList.remove("btn-danger", "btn-warning", "btn-success");
    if (buttonClass) {
      button.classList.add(buttonClass);
    }
  };

  const deleteTriggers = document.querySelectorAll("[data-confirm-href]");
  deleteTriggers.forEach((trigger) => {
    trigger.addEventListener("click", function () {
      const href = this.getAttribute("data-confirm-href") || "#";
      const title =
        this.getAttribute("data-confirm-title") || "Konfirmasi Hapus";
      const message =
        this.getAttribute("data-confirm-message") ||
        "Yakin ingin menghapus item ini?";
      const label = this.getAttribute("data-confirm-label") || "Hapus";
      const icon = this.getAttribute("data-confirm-icon") || "fas fa-trash";
      const buttonClass =
        this.getAttribute("data-confirm-button-class") || "btn-danger";

      if (confirmDeleteLabel) confirmDeleteLabel.textContent = title;
      if (confirmDeleteMessage) confirmDeleteMessage.textContent = message;

      const safeAction = (() => {
        if (!href || href === "#") return "#";
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return "#";
          if (!url.pathname.startsWith("/")) return "#";
          return url.pathname + url.search;
        } catch {
          return "#";
        }
      })();

      confirmDeleteForm.setAttribute("action", safeAction);
      confirmDeleteButton.classList.remove("disabled");
      setButtonClass(confirmDeleteButton, buttonClass);
      setButtonContent(confirmDeleteButton, icon, label);
    });
  });

  confirmDeleteForm.addEventListener("submit", () => {
    const originalText = confirmDeleteButton.textContent;
    setButtonContent(
      confirmDeleteButton,
      "fas fa-spinner fa-spin",
      "Memproses...",
    );
    confirmDeleteButton.classList.add("disabled");
    setTimeout(() => {
      setButtonContent(
        confirmDeleteButton,
        "fas fa-trash",
        originalText.trim() || "Hapus",
      );
      confirmDeleteButton.classList.remove("disabled");
    }, 1800);
  });
});
