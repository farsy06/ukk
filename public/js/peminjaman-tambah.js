document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("peminjamanForm");
  if (!form) {
    return;
  }

  const tanggalPinjam = document.getElementById("tanggal_pinjam");
  const tanggalKembali = document.getElementById("tanggal_kembali");
  const jumlahInput = document.getElementById("jumlah");
  const submitButton = document.getElementById("submitPeminjamanBtn");
  const maxStok = Number.parseInt(form.dataset.maxStok || "1", 10);
  const maxDurationDays = Number.parseInt(
    form.dataset.maxDurationDays || "7",
    10,
  );

  const pad2 = (value) => String(value).padStart(2, "0");
  const formatDate = (date) =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const parseDateInput = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }

    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day)
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = formatDate(today);

  if (tanggalPinjam) {
    tanggalPinjam.min = todayString;
    if (!tanggalPinjam.value) {
      tanggalPinjam.value = todayString;
    }
  }

  const syncTanggalKembaliMin = () => {
    if (!tanggalPinjam || !tanggalKembali) {
      return;
    }

    const pinjamDate = tanggalPinjam.value
      ? parseDateInput(tanggalPinjam.value)
      : today;
    if (!pinjamDate) {
      tanggalKembali.min = todayString;
      return;
    }

    tanggalKembali.min = formatDate(pinjamDate);

    const kembaliDate = parseDateInput(tanggalKembali.value);
    if (!kembaliDate || kembaliDate < pinjamDate) {
      tanggalKembali.value = formatDate(pinjamDate);
    }
  };

  const sanitizeJumlah = () => {
    if (!jumlahInput) {
      return;
    }

    const parsed = Number.parseInt(jumlahInput.value || "1", 10);

    if (Number.isNaN(parsed) || parsed < 1) {
      jumlahInput.value = "1";
      return;
    }

    if (parsed > maxStok) {
      jumlahInput.value = String(Math.max(maxStok, 1));
    }
  };

  if (tanggalPinjam) {
    tanggalPinjam.addEventListener("change", syncTanggalKembaliMin);
  }

  if (jumlahInput) {
    jumlahInput.addEventListener("input", sanitizeJumlah);
  }

  syncTanggalKembaliMin();
  sanitizeJumlah();

  form.addEventListener("submit", (event) => {
    const errors = [];

    const pinjamDate =
      tanggalPinjam && tanggalPinjam.value
        ? parseDateInput(tanggalPinjam.value)
        : null;
    const kembaliDate =
      tanggalKembali && tanggalKembali.value
        ? parseDateInput(tanggalKembali.value)
        : null;
    const jumlah = jumlahInput
      ? Number.parseInt(jumlahInput.value || "0", 10)
      : 0;

    if (!pinjamDate || Number.isNaN(pinjamDate.getTime())) {
      errors.push("Tanggal pinjam wajib diisi.");
    }

    if (!kembaliDate || Number.isNaN(kembaliDate.getTime())) {
      errors.push("Tanggal kembali wajib diisi.");
    }

    if (pinjamDate && kembaliDate) {
      const normalizedPinjam = new Date(pinjamDate);
      const normalizedKembali = new Date(kembaliDate);
      normalizedPinjam.setHours(0, 0, 0, 0);
      normalizedKembali.setHours(0, 0, 0, 0);

      if (normalizedKembali < normalizedPinjam) {
        errors.push(
          "Tanggal kembali harus sama dengan atau setelah tanggal pinjam.",
        );
      }

      const durationMs = normalizedKembali - normalizedPinjam;
      const durationDays = Math.floor(durationMs / (24 * 60 * 60 * 1000)) + 1;
      if (durationDays > maxDurationDays) {
        errors.push(`Durasi peminjaman maksimal ${maxDurationDays} hari.`);
      }
    }

    if (!Number.isInteger(jumlah) || jumlah < 1) {
      errors.push("Jumlah peminjaman minimal 1.");
    } else if (jumlah > maxStok) {
      errors.push(`Jumlah peminjaman melebihi stok tersedia (${maxStok}).`);
    }

    if (errors.length) {
      event.preventDefault();
      window.alert(errors.join("\n"));
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin me-1"></i>Memproses...';
    }
  });
});
