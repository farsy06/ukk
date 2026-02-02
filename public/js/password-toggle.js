// Password Visibility Toggle Functionality
// Standalone script for password visibility toggle

document.addEventListener("DOMContentLoaded", function () {
  // Function to initialize password visibility toggle
  function initPasswordToggle() {
    // Get all toggle buttons and password inputs
    const toggleButtons = document.querySelectorAll('[id*="togglePassword"]');

    // Process each toggle button
    toggleButtons.forEach(function (toggleBtn) {
      // Find the corresponding password input
      const passwordInput = toggleBtn
        .closest(".input-group")
        .querySelector('input[type="password"]');

      if (passwordInput) {
        toggleBtn.addEventListener("click", function () {
          // Toggle password visibility
          const currentType = passwordInput.getAttribute("type");
          const newType = currentType === "password" ? "text" : "password";

          passwordInput.setAttribute("type", newType);

          // Update icon
          const icon = this.querySelector("i");
          if (icon) {
            if (newType === "text") {
              icon.className = "fas fa-eye-slash";
            } else {
              icon.className = "fas fa-eye";
            }
          }
        });
      }
    });
  }

  // Initialize password toggle functionality
  initPasswordToggle();
});
