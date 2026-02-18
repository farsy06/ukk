document.addEventListener("DOMContentLoaded", () => {
  const authUi = window.authUi || null;
  const form = document.getElementById("forgotPasswordForm");
  const identifierInput = document.getElementById("identifier");
  const submitButton = document.getElementById("forgotPasswordSubmitButton");

  if (!form) {
    return;
  }

  if (authUi && typeof authUi.focusInput === "function") {
    authUi.focusInput(identifierInput);
  }

  form.addEventListener("submit", (event) => {
    const errors = [];
    const identifierValue = identifierInput ? identifierInput.value.trim() : "";

    if (!identifierValue) {
      errors.push("Username atau email harus diisi.");
    } else if (identifierValue.length < 3) {
      errors.push("Username atau email minimal 3 karakter.");
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
