-- UKK eSarpra
-- Database artifact untuk pengumpulan tugas UKK
-- Mencakup schema, relasi, index, stored procedure, function, trigger, dan contoh rollback.

CREATE DATABASE IF NOT EXISTS ukk_esarpra;
USE ukk_esarpra;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'petugas', 'peminjam') NOT NULL DEFAULT 'peminjam',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME NULL,
  remember_token VARCHAR(255) NULL,
  remember_expires DATETIME NULL,
  reset_password_token VARCHAR(255) NULL,
  reset_password_expires DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kategori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(100) NOT NULL UNIQUE,
  deskripsi TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_alat VARCHAR(100) NOT NULL,
  kategori_id INT NOT NULL,
  kondisi ENUM('baik', 'rusak_ringan', 'rusak_berat') NOT NULL DEFAULT 'baik',
  status ENUM('tersedia', 'dipinjam', 'maintenance', 'hilang') NOT NULL DEFAULT 'tersedia',
  stok INT NOT NULL DEFAULT 1,
  deskripsi TEXT NULL,
  foto VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_alat_kategori FOREIGN KEY (kategori_id) REFERENCES kategori(id)
);

CREATE TABLE IF NOT EXISTS peminjaman (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  alat_id INT NOT NULL,
  jumlah INT NOT NULL DEFAULT 1,
  tanggal_pinjam DATE NOT NULL,
  tanggal_kembali DATE NOT NULL,
  status ENUM('pending', 'disetujui', 'dipinjam', 'dikembalikan', 'ditolak', 'dibatalkan') NOT NULL DEFAULT 'pending',
  tanggal_pengambilan DATE NULL,
  tanggal_pengembalian DATE NULL,
  catatan TEXT NULL,
  denda DECIMAL(10,2) NOT NULL DEFAULT 0,
  denda_terlambat DECIMAL(10,2) NOT NULL DEFAULT 0,
  denda_insiden DECIMAL(10,2) NOT NULL DEFAULT 0,
  kondisi_pengembalian ENUM('normal', 'rusak', 'hilang') NOT NULL DEFAULT 'normal',
  status_insiden ENUM('none', 'dilaporkan', 'selesai') NOT NULL DEFAULT 'none',
  catatan_insiden TEXT NULL,
  status_pembayaran_denda ENUM('belum_bayar', 'menunggu_verifikasi', 'lunas', 'ditolak') NOT NULL DEFAULT 'belum_bayar',
  bukti_pembayaran VARCHAR(255) NULL,
  foto_pengembalian VARCHAR(255) NULL,
  tanggal_pembayaran_denda DATETIME NULL,
  catatan_verifikasi_denda TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_peminjaman_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_peminjaman_alat FOREIGN KEY (alat_id) REFERENCES alat(id)
);

CREATE TABLE IF NOT EXISTS log_aktivitas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  aktivitas TEXT NOT NULL,
  waktu DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  session_id VARCHAR(255) NULL,
  CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_alat_kategori_status ON alat(kategori_id, status);
CREATE INDEX idx_peminjaman_status_tanggal ON peminjaman(status, tanggal_kembali);
CREATE INDEX idx_log_waktu_user ON log_aktivitas(waktu, user_id);

DROP VIEW IF EXISTS v_laporan_peminjaman;
CREATE VIEW v_laporan_peminjaman AS
SELECT
  p.id,
  u.nama AS nama_peminjam,
  u.username,
  a.nama_alat,
  k.nama_kategori,
  p.jumlah,
  p.tanggal_pinjam,
  p.tanggal_kembali,
  p.tanggal_pengembalian,
  p.status,
  p.denda,
  p.status_pembayaran_denda
FROM peminjaman p
JOIN users u ON u.id = p.user_id
JOIN alat a ON a.id = p.alat_id
JOIN kategori k ON k.id = a.kategori_id;

DROP FUNCTION IF EXISTS fn_hitung_denda_terlambat;
DELIMITER $$
CREATE FUNCTION fn_hitung_denda_terlambat(
  p_tanggal_kembali DATE,
  p_tanggal_pengembalian DATE,
  p_tarif DECIMAL(10,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
  DECLARE v_hari_terlambat INT DEFAULT 0;

  IF p_tanggal_pengembalian IS NULL OR p_tanggal_pengembalian <= p_tanggal_kembali THEN
    RETURN 0;
  END IF;

  SET v_hari_terlambat = DATEDIFF(p_tanggal_pengembalian, p_tanggal_kembali);
  RETURN v_hari_terlambat * p_tarif;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_setujui_peminjaman;
DELIMITER $$
CREATE PROCEDURE sp_setujui_peminjaman(IN p_peminjaman_id INT, IN p_petugas_id INT)
BEGIN
  DECLARE v_alat_id INT;
  DECLARE v_jumlah INT;
  DECLARE v_stok INT;
  DECLARE v_status VARCHAR(20);

  START TRANSACTION;

  SELECT alat_id, jumlah, status
  INTO v_alat_id, v_jumlah, v_status
  FROM peminjaman
  WHERE id = p_peminjaman_id
  FOR UPDATE;

  IF v_status <> 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Peminjaman sudah diproses';
  END IF;

  SELECT stok INTO v_stok
  FROM alat
  WHERE id = v_alat_id
  FOR UPDATE;

  IF v_stok < v_jumlah THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stok alat tidak mencukupi';
  END IF;

  UPDATE peminjaman
  SET status = 'disetujui'
  WHERE id = p_peminjaman_id;

  UPDATE alat
  SET stok = stok - v_jumlah,
      status = CASE WHEN stok - v_jumlah <= 0 THEN 'dipinjam' ELSE status END
  WHERE id = v_alat_id;

  INSERT INTO log_aktivitas(user_id, aktivitas)
  VALUES (p_petugas_id, CONCAT('Stored procedure menyetujui peminjaman #', p_peminjaman_id));

  COMMIT;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_kembalikan_alat;
DELIMITER $$
CREATE PROCEDURE sp_kembalikan_alat(
  IN p_peminjaman_id INT,
  IN p_petugas_id INT,
  IN p_tanggal_pengembalian DATE,
  IN p_kondisi_pengembalian VARCHAR(20),
  IN p_denda_insiden DECIMAL(10,2)
)
BEGIN
  DECLARE v_alat_id INT;
  DECLARE v_jumlah INT;
  DECLARE v_status VARCHAR(20);
  DECLARE v_tanggal_kembali DATE;
  DECLARE v_denda_terlambat DECIMAL(10,2);

  START TRANSACTION;

  SELECT alat_id, jumlah, status, tanggal_kembali
  INTO v_alat_id, v_jumlah, v_status, v_tanggal_kembali
  FROM peminjaman
  WHERE id = p_peminjaman_id
  FOR UPDATE;

  IF v_status NOT IN ('disetujui', 'dipinjam') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status peminjaman tidak valid untuk pengembalian';
  END IF;

  SET v_denda_terlambat = fn_hitung_denda_terlambat(v_tanggal_kembali, p_tanggal_pengembalian, 5000);

  UPDATE peminjaman
  SET status = 'dikembalikan',
      tanggal_pengembalian = p_tanggal_pengembalian,
      kondisi_pengembalian = p_kondisi_pengembalian,
      denda_terlambat = v_denda_terlambat,
      denda_insiden = IFNULL(p_denda_insiden, 0),
      denda = v_denda_terlambat + IFNULL(p_denda_insiden, 0),
      status_pembayaran_denda = CASE
        WHEN (v_denda_terlambat + IFNULL(p_denda_insiden, 0)) > 0 THEN 'belum_bayar'
        ELSE 'lunas'
      END
  WHERE id = p_peminjaman_id;

  IF p_kondisi_pengembalian <> 'hilang' THEN
    UPDATE alat
    SET stok = stok + v_jumlah,
        status = CASE
          WHEN p_kondisi_pengembalian = 'rusak' THEN 'maintenance'
          ELSE 'tersedia'
        END
    WHERE id = v_alat_id;
  ELSE
    UPDATE alat
    SET status = 'hilang'
    WHERE id = v_alat_id;
  END IF;

  INSERT INTO log_aktivitas(user_id, aktivitas)
  VALUES (p_petugas_id, CONCAT('Stored procedure mengembalikan alat untuk peminjaman #', p_peminjaman_id));

  COMMIT;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_peminjaman_before_update_denda;
DELIMITER $$
CREATE TRIGGER trg_peminjaman_before_update_denda
BEFORE UPDATE ON peminjaman
FOR EACH ROW
BEGIN
  IF NEW.status = 'dikembalikan' AND NEW.tanggal_pengembalian IS NOT NULL THEN
    SET NEW.denda_terlambat = fn_hitung_denda_terlambat(
      NEW.tanggal_kembali,
      NEW.tanggal_pengembalian,
      5000
    );
    SET NEW.denda = NEW.denda_terlambat + IFNULL(NEW.denda_insiden, 0);
  END IF;
END$$
DELIMITER ;

-- Contoh transaksi manual dengan rollback untuk kebutuhan penilaian.
-- Jalankan blok ini secara terpisah saat demo SQL.
--
-- START TRANSACTION;
-- UPDATE alat SET stok = stok - 1 WHERE id = 1;
-- UPDATE peminjaman SET status = 'disetujui' WHERE id = 1;
-- ROLLBACK;
--
-- Setelah rollback, stok alat dan status peminjaman akan kembali ke kondisi semula.
