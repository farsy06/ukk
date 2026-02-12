window.authUi = (() => {
  const removeLocalErrors = () => {
    document.querySelectorAll(".auth-local-error").forEach((el) => el.remove());
  };

  const addLocalErrors = (form, messages) => {
    removeLocalErrors();
    if (!form || !Array.isArray(messages) || !messages.length) {
      return;
    }

    const errorDiv = document.createElement("div");
    errorDiv.className =
      "alert alert-danger alert-dismissible fade show auth-local-error";
    errorDiv.setAttribute("role", "alert");
    messages.forEach((msg) => {
      const messageRow = document.createElement("div");
      const icon = document.createElement("i");
      icon.className = "fas fa-exclamation-circle me-1";
      messageRow.appendChild(icon);
      messageRow.appendChild(document.createTextNode(String(msg)));
      errorDiv.appendChild(messageRow);
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.setAttribute("data-bs-dismiss", "alert");
    closeButton.setAttribute("aria-label", "Tutup");
    errorDiv.appendChild(closeButton);

    form.insertBefore(errorDiv, form.firstChild);
  };

  const focusInput = (input) => {
    if (input) {
      input.focus();
    }
  };

  const setSubmitLoading = (button, html) => {
    if (!button) {
      return;
    }

    button.disabled = true;
    button.innerHTML = html;
  };

  return {
    addLocalErrors,
    focusInput,
    removeLocalErrors,
    setSubmitLoading,
  };
})();
