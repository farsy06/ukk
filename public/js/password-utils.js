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

  const isStrong = (value) =>
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(value);

  const setRuleState = (element, passed, successText, defaultText) => {
    if (!element) return;

    element.innerHTML = passed
      ? `<i class="fas fa-check text-success"></i> ${successText}`
      : `<i class="fas fa-times text-danger"></i> ${defaultText}`;
    element.classList.toggle("text-success", passed);
    element.classList.toggle("text-danger", !passed);
  };

  const updateStrengthIndicators = () => {
    if (!password) return;
    const pwd = password.value;

    setRuleState(
      lengthCheck,
      pwd.length >= 8,
      "Minimal 8 karakter",
      "Minimal 8 karakter",
    );
    setRuleState(
      uppercaseCheck,
      /[A-Z]/.test(pwd),
      "Huruf besar (A-Z)",
      "Huruf besar (A-Z)",
    );
    setRuleState(
      lowercaseCheck,
      /[a-z]/.test(pwd),
      "Huruf kecil (a-z)",
      "Huruf kecil (a-z)",
    );
    setRuleState(numberCheck, /\d/.test(pwd), "Angka (0-9)", "Angka (0-9)");
    setRuleState(
      specialCheck,
      /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      "Karakter spesial (!@#$%^&*)",
      "Karakter spesial (!@#$%^&*)",
    );
  };

  const updateMatchMessage = () => {
    if (!password || !confirmPassword || !passwordMatchMessage) return;

    if (
      password.value === confirmPassword.value &&
      confirmPassword.value !== ""
    ) {
      passwordMatchMessage.innerHTML =
        '<i class="fas fa-check text-success"></i> Password cocok';
      passwordMatchMessage.classList.remove("text-danger");
      passwordMatchMessage.classList.add("form-text", "text-success");
    } else if (confirmPassword.value !== "") {
      passwordMatchMessage.innerHTML =
        '<i class="fas fa-times text-danger"></i> Password tidak cocok';
      passwordMatchMessage.classList.remove("text-success");
      passwordMatchMessage.classList.add("form-text", "text-danger");
    } else {
      passwordMatchMessage.innerHTML = "";
      passwordMatchMessage.classList.remove("text-success", "text-danger");
      passwordMatchMessage.classList.add("form-text");
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
