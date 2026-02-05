document.addEventListener("DOMContentLoaded", function () {
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const passwordMatchMessage = document.getElementById(
    "password-match-message",
  );

  const lengthCheck = document.getElementById("length-check");
  const uppercaseCheck = document.getElementById("uppercase-check");
  const lowercaseCheck = document.getElementById("lowercase-check");
  const numberCheck = document.getElementById("number-check");
  const specialCheck = document.getElementById("special-check");

  const togglePassword = document.getElementById("togglePassword");
  const toggleConfirmPassword = document.getElementById(
    "toggleConfirmPassword",
  );

  const isStrong = (value) => {
    return (
      value.length >= 8 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /\d/.test(value) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(value)
    );
  };

  const updateStrengthIndicators = () => {
    if (!password) return;
    const pwd = password.value;

    if (lengthCheck) {
      if (pwd.length >= 8) {
        lengthCheck.innerHTML =
          '<i class="fas fa-check text-success"></i> Minimal 8 karakter';
        lengthCheck.className = "text-success";
      } else {
        lengthCheck.innerHTML =
          '<i class="fas fa-times text-danger"></i> Minimal 8 karakter';
        lengthCheck.className = "text-danger";
      }
    }

    if (uppercaseCheck) {
      if (/[A-Z]/.test(pwd)) {
        uppercaseCheck.innerHTML =
          '<i class="fas fa-check text-success"></i> Huruf besar (A-Z)';
        uppercaseCheck.className = "text-success";
      } else {
        uppercaseCheck.innerHTML =
          '<i class="fas fa-times text-danger"></i> Huruf besar (A-Z)';
        uppercaseCheck.className = "text-danger";
      }
    }

    if (lowercaseCheck) {
      if (/[a-z]/.test(pwd)) {
        lowercaseCheck.innerHTML =
          '<i class="fas fa-check text-success"></i> Huruf kecil (a-z)';
        lowercaseCheck.className = "text-success";
      } else {
        lowercaseCheck.innerHTML =
          '<i class="fas fa-times text-danger"></i> Huruf kecil (a-z)';
        lowercaseCheck.className = "text-danger";
      }
    }

    if (numberCheck) {
      if (/\d/.test(pwd)) {
        numberCheck.innerHTML =
          '<i class="fas fa-check text-success"></i> Angka (0-9)';
        numberCheck.className = "text-success";
      } else {
        numberCheck.innerHTML =
          '<i class="fas fa-times text-danger"></i> Angka (0-9)';
        numberCheck.className = "text-danger";
      }
    }

    if (specialCheck) {
      if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
        specialCheck.innerHTML =
          '<i class="fas fa-check text-success"></i> Karakter spesial (!@#$%^&*)';
        specialCheck.className = "text-success";
      } else {
        specialCheck.innerHTML =
          '<i class="fas fa-times text-danger"></i> Karakter spesial (!@#$%^&*)';
        specialCheck.className = "text-danger";
      }
    }
  };

  const updateMatchMessage = () => {
    if (!password || !confirmPassword || !passwordMatchMessage) return;

    if (
      password.value === confirmPassword.value &&
      confirmPassword.value !== ""
    ) {
      passwordMatchMessage.innerHTML =
        '<i class="fas fa-check text-success"></i> Password cocok';
      passwordMatchMessage.className = "text-success";
    } else if (confirmPassword.value !== "") {
      passwordMatchMessage.innerHTML =
        '<i class="fas fa-times text-danger"></i> Password tidak cocok';
      passwordMatchMessage.className = "text-danger";
    } else {
      passwordMatchMessage.innerHTML = "";
      passwordMatchMessage.className = "form-text";
    }
  };

  const attachToggle = (button, input) => {
    if (!button || !input) return;
    button.addEventListener("click", function () {
      const type =
        input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);

      const icon = this.querySelector("i, svg");
      if (icon) {
        if (icon.tagName.toLowerCase() === "svg") {
          icon.classList.toggle("fa-eye", type === "password");
          icon.classList.toggle("fa-eye-slash", type !== "password");
        } else {
          icon.className =
            type === "password" ? "fas fa-eye" : "fas fa-eye-slash";
        }
      }
    });
  };

  if (password) {
    password.addEventListener("input", function () {
      updateStrengthIndicators();
      updateMatchMessage();
    });
  }

  if (confirmPassword) {
    confirmPassword.addEventListener("input", updateMatchMessage);
  }

  attachToggle(togglePassword, password);
  attachToggle(toggleConfirmPassword, confirmPassword);

  updateStrengthIndicators();
  updateMatchMessage();

  window.passwordUtils = {
    isStrong,
  };
});
