document.addEventListener("DOMContentLoaded", () => {
  const authUi = window.authUi || null;
  const form = document.getElementById("registerForm");
  const submitButton = document.getElementById("registerSubmitButton");
  const nameInput = document.getElementById("nama");
  const usernameInput = document.getElementById("username");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const termsInput = document.getElementById("terms");

  if (!form) {
    return;
  }

  if (authUi && typeof authUi.focusInput === "function") {
    authUi.focusInput(nameInput);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    const nameValue = nameInput ? nameInput.value.trim() : "";
    const usernameValue = usernameInput ? usernameInput.value.trim() : "";
    const emailValue = emailInput ? emailInput.value.trim() : "";
    const passwordValue = passwordInput ? passwordInput.value : "";
    const confirmPasswordValue = confirmPasswordInput
      ? confirmPasswordInput.value
      : "";
    const termsChecked = termsInput ? termsInput.checked : false;

    if (!nameValue) {
      errors.push("Nama lengkap harus diisi.");
    } else if (nameValue.length < 2) {
      errors.push("Nama minimal 2 karakter.");
    }

    if (!usernameValue) {
      errors.push("Username harus diisi.");
    } else if (usernameValue.length < 3) {
      errors.push("Username minimal 3 karakter.");
    }

    if (!emailValue) {
      errors.push("Email harus diisi.");
    } else if (!emailRegex.test(emailValue)) {
      errors.push("Format email tidak valid.");
    }

    if (!passwordValue) {
      errors.push("Password harus diisi.");
    } else if (!isStrongPassword(passwordValue)) {
      errors.push("Password tidak memenuhi kriteria keamanan.");
    }

    if (!confirmPasswordValue) {
      errors.push("Konfirmasi password harus diisi.");
    } else if (passwordValue !== confirmPasswordValue) {
      errors.push("Password dan konfirmasi password tidak cocok.");
    }

    if (!termsChecked) {
      errors.push("Anda harus menyetujui syarat dan ketentuan.");
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
        '<i class="fas fa-spinner fa-spin me-2"></i>Mendaftarkan...',
      );
    }
  });
});
