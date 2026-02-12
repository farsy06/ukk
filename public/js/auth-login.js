document.addEventListener("DOMContentLoaded", () => {
  const authUi = window.authUi || null;
  const form = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const submitButton = document.getElementById("loginSubmitButton");

  if (!form) {
    return;
  }

  if (authUi && typeof authUi.focusInput === "function") {
    authUi.focusInput(usernameInput);
  }

  form.addEventListener("submit", (event) => {
    const errors = [];
    const usernameValue = usernameInput ? usernameInput.value.trim() : "";
    const passwordValue = passwordInput ? passwordInput.value : "";

    if (!usernameValue) {
      errors.push("Username harus diisi.");
    } else if (usernameValue.length < 3) {
      errors.push("Username minimal 3 karakter.");
    }

    if (!passwordValue) {
      errors.push("Password harus diisi.");
    } else if (passwordValue.length < 6) {
      errors.push("Password minimal 6 karakter.");
    }

    if (errors.length) {
      event.preventDefault();
      if (authUi && typeof authUi.addLocalErrors === "function") {
        authUi.addLocalErrors(form, errors);
      }
      return;
    }

    if (authUi && typeof authUi.removeLocalErrors === "function") {
      authUi.removeLocalErrors();
    }
    if (authUi && typeof authUi.setSubmitLoading === "function") {
      authUi.setSubmitLoading(
        submitButton,
        '<i class="fas fa-spinner fa-spin me-2"></i>Memproses...',
      );
    }
  });
});
