const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("id-ID");
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("id-ID");
};

const buildPdfBuffer = (writer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    writer(doc);
    doc.end();
  });

const addSectionTitle = (doc, title) => {
  doc.moveDown(0.5);
  doc.fontSize(12).text(title, { underline: true });
  doc.moveDown(0.3);
};

const addKeyValue = (doc, items) => {
  items.forEach(([label, value]) => {
    doc.fontSize(10).text(`${label}: ${value}`);
  });
  doc.moveDown(0.3);
};

const buildUserExcel = async (reportData, filters) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("User");

  sheet.addRow([reportData.title]);
  sheet.addRow([`Generated: ${formatDateTime(reportData.generatedAt)}`]);
  sheet.addRow([
    `Periode: ${
      filters?.startDate && filters?.endDate
        ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
            filters.endDate,
          )}`
        : "Semua"
    }`,
  ]);
  sheet.addRow([]);

  sheet.columns = [
    { header: "#", key: "no", width: 6 },
    { header: "Nama", key: "nama", width: 25 },
    { header: "Username", key: "username", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role", key: "role", width: 12 },
    { header: "Tanggal Dibuat", key: "created", width: 20 },
  ];

  reportData.users.forEach((user, index) => {
    sheet.addRow({
      no: index + 1,
      nama: user.nama,
      username: user.username,
      email: user.email,
      role: user.role,
      created: formatDateTime(user.created_at),
    });
  });

  return workbook.xlsx.writeBuffer();
};

const buildUserPdf = (reportData, filters) =>
  buildPdfBuffer((doc) => {
    doc.fontSize(16).text(reportData.title);
    doc
      .fontSize(10)
      .text(`Generated: ${formatDateTime(reportData.generatedAt)}`);
    doc.text(
      `Periode: ${
        filters?.startDate && filters?.endDate
          ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
              filters.endDate,
            )}`
          : "Semua"
      }`,
    );
    addSectionTitle(doc, "Ringkasan");
    addKeyValue(doc, [
      ["Total User", reportData.stats.total],
      ["Petugas", reportData.stats.petugas],
      ["Peminjam", reportData.stats.peminjam],
    ]);
    addSectionTitle(doc, "Daftar User");
    reportData.users.forEach((user, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${user.nama} | ${user.username} | ${user.email} | ${
            user.role
          } | ${formatDateTime(user.created_at)}`,
        );
    });
  });

const buildInventoryExcel = async (reportData) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventori");

  sheet.addRow([reportData.title]);
  sheet.addRow([`Generated: ${formatDateTime(reportData.generatedAt)}`]);
  sheet.addRow([]);

  sheet.columns = [
    { header: "#", key: "no", width: 6 },
    { header: "Nama Alat", key: "nama", width: 25 },
    { header: "Kategori", key: "kategori", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Kondisi", key: "kondisi", width: 12 },
  ];

  reportData.alat.forEach((alat, index) => {
    sheet.addRow({
      no: index + 1,
      nama: alat.nama_alat,
      kategori: alat.kategori?.nama_kategori || "Tidak Diketahui",
      status: alat.status,
      kondisi: alat.kondisi,
    });
  });

  return workbook.xlsx.writeBuffer();
};

const buildInventoryPdf = (reportData) =>
  buildPdfBuffer((doc) => {
    doc.fontSize(16).text(reportData.title);
    doc
      .fontSize(10)
      .text(`Generated: ${formatDateTime(reportData.generatedAt)}`);
    addSectionTitle(doc, "Ringkasan");
    addKeyValue(doc, [
      ["Total", reportData.stats.total],
      ["Tersedia", reportData.stats.tersedia],
      ["Dipinjam", reportData.stats.dipinjam],
      ["Rusak", reportData.stats.rusak],
    ]);
    addSectionTitle(doc, "Daftar Alat");
    reportData.alat.forEach((alat, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${alat.nama_alat} | ${
            alat.kategori?.nama_kategori || "Tidak Diketahui"
          } | ${alat.status} | ${alat.kondisi}`,
        );
    });
  });

const buildPeminjamanExcel = async (reportData, filters) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Peminjaman");

  sheet.addRow([reportData.title]);
  sheet.addRow([`Generated: ${formatDateTime(reportData.generatedAt)}`]);
  sheet.addRow([
    `Periode: ${
      filters?.startDate && filters?.endDate
        ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
            filters.endDate,
          )}`
        : "Semua"
    }`,
  ]);
  sheet.addRow([]);

  sheet.columns = [
    { header: "#", key: "no", width: 6 },
    { header: "Nama Peminjam", key: "nama", width: 25 },
    { header: "Alat", key: "alat", width: 25 },
    { header: "Kategori", key: "kategori", width: 18 },
    { header: "Jumlah", key: "jumlah", width: 10 },
    { header: "Tanggal Pinjam", key: "pinjam", width: 18 },
    { header: "Tanggal Kembali", key: "kembali", width: 18 },
    { header: "Status", key: "status", width: 12 },
  ];

  reportData.peminjaman.forEach((item, index) => {
    sheet.addRow({
      no: index + 1,
      nama: item.user?.nama || "Tidak Diketahui",
      alat: item.alat?.nama_alat || "Tidak Diketahui",
      kategori: item.alat?.kategori?.nama_kategori || "Tidak Diketahui",
      jumlah: item.jumlah,
      pinjam: formatDateOnly(item.tanggal_pinjam),
      kembali: formatDateOnly(item.tanggal_kembali),
      status: item.status,
    });
  });

  return workbook.xlsx.writeBuffer();
};

const buildPeminjamanPdf = (reportData, filters) =>
  buildPdfBuffer((doc) => {
    doc.fontSize(16).text(reportData.title);
    doc
      .fontSize(10)
      .text(`Generated: ${formatDateTime(reportData.generatedAt)}`);
    doc.text(
      `Periode: ${
        filters?.startDate && filters?.endDate
          ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
              filters.endDate,
            )}`
          : "Semua"
      }`,
    );
    addSectionTitle(doc, "Ringkasan");
    addKeyValue(doc, [
      ["Total", reportData.stats.total],
      ["Diproses", reportData.stats.diproses],
      ["Dipinjam", reportData.stats.dipinjam],
      ["Selesai", reportData.stats.selesai],
      ["Ditolak", reportData.stats.ditolak],
    ]);
    addSectionTitle(doc, "Daftar Peminjaman");
    reportData.peminjaman.forEach((item, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${item.user?.nama || "Tidak Diketahui"} | ${
            item.alat?.nama_alat || "Tidak Diketahui"
          } | ${formatDateOnly(item.tanggal_pinjam)} - ${formatDateOnly(
            item.tanggal_kembali,
          )} | ${item.status}`,
        );
    });
  });

const buildActivityExcel = async (reportData, filters) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Aktivitas");

  sheet.addRow([reportData.title]);
  sheet.addRow([`Generated: ${formatDateTime(reportData.generatedAt)}`]);
  sheet.addRow([
    `Periode: ${
      filters?.startDate && filters?.endDate
        ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
            filters.endDate,
          )}`
        : "Semua"
    }`,
  ]);
  sheet.addRow([]);

  sheet.columns = [
    { header: "#", key: "no", width: 6 },
    { header: "User", key: "user", width: 20 },
    { header: "Aktivitas", key: "aktivitas", width: 40 },
    { header: "Waktu", key: "waktu", width: 20 },
  ];

  reportData.logs.forEach((log, index) => {
    sheet.addRow({
      no: index + 1,
      user: log.user?.username || "System",
      aktivitas: log.aktivitas,
      waktu: formatDateTime(log.waktu),
    });
  });

  return workbook.xlsx.writeBuffer();
};

const buildActivityPdf = (reportData, filters) =>
  buildPdfBuffer((doc) => {
    doc.fontSize(16).text(reportData.title);
    doc
      .fontSize(10)
      .text(`Generated: ${formatDateTime(reportData.generatedAt)}`);
    doc.text(
      `Periode: ${
        filters?.startDate && filters?.endDate
          ? `${formatDateOnly(filters.startDate)} - ${formatDateOnly(
              filters.endDate,
            )}`
          : "Semua"
      }`,
    );
    addSectionTitle(doc, "Ringkasan");
    addKeyValue(doc, [["Total", reportData.stats.total]]);
    addSectionTitle(doc, "Log Aktivitas");
    reportData.logs.forEach((log, index) => {
      doc
        .fontSize(10)
        .text(
          `${index + 1}. ${log.user?.username || "System"} | ${
            log.aktivitas
          } | ${formatDateTime(log.waktu)}`,
        );
    });
  });

const buildStatisticsExcel = async (stats) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Statistik");

  sheet.addRow(["Statistik Sistem"]);
  sheet.addRow([`Generated: ${formatDateTime(stats.generatedAt)}`]);
  sheet.addRow([]);

  sheet.addRow(["Total User", stats.users.total]);
  sheet.addRow(["Total Alat", stats.alat.total]);
  sheet.addRow(["Total Peminjaman", stats.peminjaman.total]);
  sheet.addRow(["Total Kategori", stats.kategori.total]);
  sheet.addRow(["Total Aktivitas", stats.aktivitas.total]);

  return workbook.xlsx.writeBuffer();
};

const buildStatisticsPdf = (stats) =>
  buildPdfBuffer((doc) => {
    doc.fontSize(16).text("Statistik Sistem");
    doc.fontSize(10).text(`Generated: ${formatDateTime(stats.generatedAt)}`);
    addSectionTitle(doc, "Ringkasan");
    addKeyValue(doc, [
      ["Total User", stats.users.total],
      ["Total Alat", stats.alat.total],
      ["Total Peminjaman", stats.peminjaman.total],
      ["Total Kategori", stats.kategori.total],
      ["Total Aktivitas", stats.aktivitas.total],
    ]);
  });

module.exports = {
  buildUserExcel,
  buildUserPdf,
  buildInventoryExcel,
  buildInventoryPdf,
  buildPeminjamanExcel,
  buildPeminjamanPdf,
  buildActivityExcel,
  buildActivityPdf,
  buildStatisticsExcel,
  buildStatisticsPdf,
};
