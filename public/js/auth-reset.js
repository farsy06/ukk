document.addEventListener("DOMContentLoaded", () => {
  const authUi = window.authUi || null;
  const form = document.getElementById("resetPasswordForm");
  const submitButton = document.getElementById("resetPasswordSubmitButton");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");

  if (!form) {
    return;
  }

  if (authUi && typeof authUi.focusInput === "function") {
    authUi.focusInput(passwordInput);
  }

  const isStrongPassword = (value) => {
    if (
      window.passwordUtils &&
      typeof window.passwordUtils.isStrong === "function"
    ) {
      return window.passwordUtils.isStrong(value);
    }

    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(value)
    );
  };

  form.addEventListener("submit", (event) => {
    const errors = [];
    const passwordValue = passwordInput ? passwordInput.value : "";
    const confirmPasswordValue = confirmPasswordInput
      ? confirmPasswordInput.value
      : "";

    if (!passwordValue) {
      errors.push("Password baru harus diisi.");
    } else if (!isStrongPassword(passwordValue)) {
      errors.push("Password baru tidak memenuhi kriteria keamanan.");
    }

    if (!confirmPasswordValue) {
      errors.push("Konfirmasi password harus diisi.");
    } else if (passwordValue !== confirmPasswordValue) {
      errors.push("Password dan konfirmasi password tidak cocok.");
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
        '<i class="fas fa-spinner fa-spin me-2"></i>Menyimpan...',
      );
    }
  });
});
