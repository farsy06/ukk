document.addEventListener("DOMContentLoaded", () => {
  const cancelForms = document.querySelectorAll("form[data-confirm-cancel]");
  if (!cancelForms.length) {
    return;
  }

  cancelForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      const confirmed = window.confirm(
        "Batalkan pengajuan ini? Stok alat akan dikembalikan jika pembatalan berhasil.",
      );

      if (!confirmed) {
        event.preventDefault();
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML =
          '<i class="fas fa-spinner fa-spin me-1"></i>Memproses...';
      }
    });
  });
});
