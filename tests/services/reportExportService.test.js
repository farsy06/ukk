jest.mock("exceljs", () => {
  let lastWorkbook = null;

  class MockSheet {
    constructor(name) {
      this.name = name;
      this.rows = [];
      this.columns = null;
    }
    addRow(row) {
      this.rows.push(row);
    }
  }

  class Workbook {
    constructor() {
      lastWorkbook = this;
      this.sheets = [];
      this.xlsx = {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from("excel")),
      };
    }
    addWorksheet(name) {
      const sheet = new MockSheet(name);
      this.sheets.push(sheet);
      return sheet;
    }
  }

  return {
    Workbook,
    __getLastWorkbook: () => lastWorkbook,
  };
});

jest.mock("pdfkit", () => {
  const { EventEmitter } = require("events");
  return class MockPDFDocument extends EventEmitter {
    constructor() {
      super();
      this.fontSizes = [];
      this.texts = [];
    }
    fontSize(size) {
      this.fontSizes.push(size);
      return this;
    }
    text(text) {
      this.texts.push(text);
      return this;
    }
    moveDown() {
      return this;
    }
    end() {
      this.emit("data", Buffer.from("pdf"));
      this.emit("end");
    }
  };
});

const ExcelJS = require("exceljs");
const {
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
} = require("../../src/services/reportExportService");

describe("Report Export Service", () => {
  const baseDate = new Date("2026-02-10T00:00:00.000Z");

  test("buildUserExcel writes buffer and rows", async () => {
    const reportData = {
      title: "Laporan User Sistem",
      generatedAt: baseDate,
      users: [
        {
          nama: "User A",
          username: "usera",
          email: "a@example.com",
          role: "peminjam",
          created_at: baseDate,
        },
      ],
    };
    const buffer = await buildUserExcel(reportData, {
      startDate: baseDate,
      endDate: baseDate,
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const workbook = ExcelJS.__getLastWorkbook();
    expect(workbook.xlsx.writeBuffer).toHaveBeenCalledTimes(1);
    expect(workbook.sheets[0].columns.length).toBeGreaterThan(0);
  });

  test("buildUserPdf returns buffer", async () => {
    const reportData = {
      title: "Laporan User Sistem",
      generatedAt: baseDate,
      stats: { total: 1, petugas: 0, peminjam: 1 },
      users: [
        {
          nama: "User A",
          username: "usera",
          email: "a@example.com",
          role: "peminjam",
          created_at: baseDate,
        },
      ],
    };

    const buffer = await buildUserPdf(reportData, null);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildInventoryExcel writes buffer", async () => {
    const reportData = {
      title: "Laporan Inventori Alat",
      generatedAt: baseDate,
      alat: [
        {
          nama_alat: "Alat A",
          status: "tersedia",
          kondisi: "baik",
          kategori: { nama_kategori: "K1" },
        },
      ],
    };
    const buffer = await buildInventoryExcel(reportData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildInventoryPdf returns buffer", async () => {
    const reportData = {
      title: "Laporan Inventori Alat",
      generatedAt: baseDate,
      stats: { total: 1, tersedia: 1, dipinjam: 0, rusak: 0 },
      alat: [
        {
          nama_alat: "Alat A",
          status: "tersedia",
          kondisi: "baik",
          kategori: { nama_kategori: "K1" },
        },
      ],
    };
    const buffer = await buildInventoryPdf(reportData);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildPeminjamanExcel writes buffer", async () => {
    const reportData = {
      title: "Laporan Peminjaman",
      generatedAt: baseDate,
      peminjaman: [
        {
          user: { nama: "User A" },
          alat: { nama_alat: "Alat A", kategori: { nama_kategori: "K1" } },
          jumlah: 1,
          tanggal_pinjam: baseDate,
          tanggal_kembali: baseDate,
          status: "dipinjam",
        },
      ],
    };
    const buffer = await buildPeminjamanExcel(reportData, {});
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildPeminjamanPdf returns buffer", async () => {
    const reportData = {
      title: "Laporan Peminjaman",
      generatedAt: baseDate,
      stats: {
        total: 1,
        diproses: 0,
        dipinjam: 1,
        selesai: 0,
        ditolak: 0,
      },
      peminjaman: [
        {
          user: { nama: "User A" },
          alat: { nama_alat: "Alat A" },
          tanggal_pinjam: baseDate,
          tanggal_kembali: baseDate,
          status: "dipinjam",
        },
      ],
    };
    const buffer = await buildPeminjamanPdf(reportData, null);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildActivityExcel writes buffer", async () => {
    const reportData = {
      title: "Laporan Aktivitas Sistem",
      generatedAt: baseDate,
      logs: [
        {
          user: { username: "admin" },
          aktivitas: "Login",
          waktu: baseDate,
        },
      ],
    };
    const buffer = await buildActivityExcel(reportData, {
      startDate: baseDate,
      endDate: baseDate,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildActivityPdf returns buffer", async () => {
    const reportData = {
      title: "Laporan Aktivitas Sistem",
      generatedAt: baseDate,
      stats: { total: 1 },
      logs: [
        {
          user: { username: "admin" },
          aktivitas: "Login",
          waktu: baseDate,
        },
      ],
    };
    const buffer = await buildActivityPdf(reportData, null);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildStatisticsExcel writes buffer", async () => {
    const stats = {
      generatedAt: baseDate,
      users: { total: 1 },
      alat: { total: 2 },
      peminjaman: { total: 3 },
      kategori: { total: 4 },
      aktivitas: { total: 5 },
    };
    const buffer = await buildStatisticsExcel(stats);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildStatisticsPdf returns buffer", async () => {
    const stats = {
      generatedAt: baseDate,
      users: { total: 1 },
      alat: { total: 2 },
      peminjaman: { total: 3 },
      kategori: { total: 4 },
      aktivitas: { total: 5 },
    };
    const buffer = await buildStatisticsPdf(stats);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildUserExcel handles missing filters and null dates", async () => {
    const reportData = {
      title: "Laporan User Sistem",
      generatedAt: null,
      users: [
        {
          nama: "User A",
          username: "usera",
          email: "a@example.com",
          role: "peminjam",
          created_at: null,
        },
      ],
    };

    await buildUserExcel(reportData);
    const workbook = ExcelJS.__getLastWorkbook();
    const rows = workbook.sheets[0].rows.map((row) => row[0]);
    expect(rows).toContain("Periode: Semua");
  });

  test("buildInventoryExcel handles missing kategori", async () => {
    const reportData = {
      title: "Laporan Inventori Alat",
      generatedAt: baseDate.toISOString(),
      alat: [
        {
          nama_alat: "Alat A",
          status: "tersedia",
          kondisi: "baik",
          kategori: null,
        },
      ],
    };
    await buildInventoryExcel(reportData);
    const workbook = ExcelJS.__getLastWorkbook();
    const lastRow = workbook.sheets[0].rows[workbook.sheets[0].rows.length - 1];
    expect(lastRow.kategori || lastRow[2]).toBe("Tidak Diketahui");
  });

  test("buildPeminjamanExcel handles missing user/alat and no filters", async () => {
    const reportData = {
      title: "Laporan Peminjaman",
      generatedAt: baseDate,
      peminjaman: [
        {
          user: null,
          alat: null,
          jumlah: 1,
          tanggal_pinjam: "2026-02-01",
          tanggal_kembali: "2026-02-02",
          status: "dipinjam",
        },
      ],
    };
    await buildPeminjamanExcel(reportData);
    const workbook = ExcelJS.__getLastWorkbook();
    const rows = workbook.sheets[0].rows.map((row) => row[0]);
    expect(rows).toContain("Periode: Semua");
  });

  test("buildActivityExcel handles system user and no filters", async () => {
    const reportData = {
      title: "Laporan Aktivitas Sistem",
      generatedAt: baseDate,
      logs: [
        {
          user: null,
          aktivitas: "Login",
          waktu: null,
        },
      ],
    };
    await buildActivityExcel(reportData);
    const workbook = ExcelJS.__getLastWorkbook();
    const rows = workbook.sheets[0].rows.map((row) => row[0]);
    expect(rows).toContain("Periode: Semua");
  });

  test("buildPeminjamanPdf handles missing user/alat and filters", async () => {
    const reportData = {
      title: "Laporan Peminjaman",
      generatedAt: baseDate,
      stats: {
        total: 1,
        diproses: 0,
        dipinjam: 1,
        selesai: 0,
        ditolak: 0,
      },
      peminjaman: [
        {
          user: null,
          alat: null,
          tanggal_pinjam: baseDate,
          tanggal_kembali: baseDate,
          status: "dipinjam",
        },
      ],
    };

    const buffer = await buildPeminjamanPdf(reportData, {
      startDate: baseDate,
      endDate: baseDate,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  test("buildActivityPdf handles filters and system user", async () => {
    const reportData = {
      title: "Laporan Aktivitas Sistem",
      generatedAt: baseDate,
      stats: { total: 1 },
      logs: [
        {
          user: null,
          aktivitas: "Login",
          waktu: baseDate,
        },
      ],
    };

    const buffer = await buildActivityPdf(reportData, {
      startDate: baseDate,
      endDate: baseDate,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});
