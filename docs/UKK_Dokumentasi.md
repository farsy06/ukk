# Dokumentasi UKK - eSarpra (Sistem Peminjaman Alat)

Dokumen ini menyajikan metode pengembangan **Waterfall (sederhana/prototype)**, struktur data + akses data (termasuk tipe data), diagram (ERD & diagram program), flowchart/pseudocode untuk proses inti, serta dokumentasi modul (Input-Proses-Output) berdasarkan implementasi pada repo ini.

---

## 1) Metode Pengembangan: Waterfall (Sederhana/Prototype)

### a. Analisis Kebutuhan

#### Tujuan sistem

- Mengelola inventaris alat (kategori, kondisi, stok, status).
- Mengelola akun pengguna dengan role: `admin`, `petugas`, `peminjam`.
- Mengelola transaksi peminjaman: pengajuan, persetujuan/penolakan, pengembalian.
- Menyediakan riwayat, log aktivitas, dan laporan ringkas.

#### Aktor & hak akses

- **Peminjam**
  - Registrasi dan login.
  - Melihat daftar alat yang tersedia.
  - Mengajukan peminjaman.
  - Membatalkan pengajuan selama masih `pending`.
  - Melihat riwayat peminjaman.
- **Petugas**
  - Login.
  - Melihat daftar peminjaman aktif (pending/disetujui/dipinjam).
  - Menyetujui / menolak pengajuan.
  - Mengonfirmasi pengembalian.
  - Melihat laporan (route `/laporan`).
- **Admin**
  - Login.
  - Dashboard statistik.
  - CRUD kategori & alat.
  - Manajemen user (buat/hapus non-admin).
  - Melihat log aktivitas.
  - Melihat laporan (route `/admin/laporan`).

#### Kebutuhan fungsional (ringkas)

- Autentikasi berbasis session + (opsional) “remember me”.
- Otorisasi berbasis role.
- Validasi input (tanggal peminjaman, jumlah, form required).
- Pencatatan log aktivitas.
- Cache untuk beberapa halaman indeks (alat/kategori/peminjaman/dashboard).

#### Kebutuhan non-fungsional (ringkas)

- Keamanan: rate limit login, CSRF, security headers, sanitasi input.
- Konsistensi data: relasi foreign key dan validasi model.
- Maintainability: arsitektur berlapis routes → controller → service → model.

### b. Desain (ERD & Diagram Program)

Deliverable:

- **ERD** (lihat bagian 3).
- **Diagram arsitektur program & alur kontrol** (lihat bagian 3).
- Rancangan proses inti: login, peminjaman, pengembalian + denda (lihat bagian 4).

### c. Implementasi Kode

#### Teknologi

- Node.js + Express (`src/app.js`)
- View: EJS (`src/views/`)
- ORM: Sequelize (`src/models/`)
- DB: MySQL (konfigurasi di `src/config/database`)

#### Lapisan aplikasi (ringkas)

- Route: `src/routes/web.js`
- Controller: `src/controllers/*.js`
- Service (business logic): `src/services/*.js`
- Model (schema + validasi + relasi): `src/models/*.js`, `src/models/associations.js`
- Middleware: `src/middleware/*.js`

### d. Pengujian

Pengujian dilakukan menggunakan Jest (lihat script `npm run test`) dengan fokus:

- Unit test util/middleware & service.
- Test controller/route menggunakan supertest (lihat folder `tests/`).

Contoh skenario uji inti (minimal):

- Login: username tidak ditemukan, password salah, sukses login dan redirect sesuai role.
- Pengajuan peminjaman: tanggal tidak valid, stok tidak cukup, sukses membuat `pending`.
- Persetujuan petugas: hanya `pending` yang bisa disetujui; stok berkurang.
- Pengembalian: status valid untuk return; stok bertambah; status menjadi `dikembalikan`.

### e. Dokumentasi

Deliverable:

- Struktur data + tipe data (bagian 2).
- Diagram (bagian 3).
- Flowchart/pseudocode (bagian 4).
- Dokumentasi modul IPO (bagian 5).

---

## 2) Struktur Data, Akses Data, dan Control Program

### 2.1 Struktur Data (Model/Tabel) + Tipe Data

Catatan:

- Definisi field mengikuti Sequelize model di `src/models/`.
- Penamaan tabel menggunakan `underscored` dan `timestamps: false` (kolom waktu didefinisikan manual).

#### Tabel: `users` (Model: `User`)

Sumber: `src/models/User.js`

| Field | Tipe | Aturan/Pembatasan | Keterangan |
| --- | --- | --- | --- |
| `id` | INT | PK, AI, NOT NULL | ID user |
| `nama` | VARCHAR(100) | NOT NULL | Nama lengkap |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Username login |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | Email |
| `password` | VARCHAR(255) | NOT NULL | Password hash (bcrypt) |
| `role` | ENUM | `admin/petugas/peminjam` | Role akses |
| `is_active` | BOOLEAN | default `true` | Status akun |
| `last_login` | DATETIME | nullable | Terakhir login |
| `remember_token` | VARCHAR(255) | nullable | Token (hash) remember-me |
| `remember_expires` | DATETIME | nullable | Expire token |
| `created_at` | DATETIME | default NOW | Waktu dibuat |
| `updated_at` | DATETIME | default NOW | Waktu diubah |

#### Tabel: `kategori` (Model: `Kategori`)

Sumber: `src/models/Kategori.js`

| Field | Tipe | Aturan/Pembatasan | Keterangan |
| --- | --- | --- | --- |
| `id` | INT | PK, AI, NOT NULL | ID kategori |
| `nama_kategori` | VARCHAR(100) | UNIQUE, NOT NULL | Nama kategori |
| `deskripsi` | TEXT | nullable | Deskripsi |
| `is_active` | BOOLEAN | default `true` | Status kategori |
| `created_at` | DATETIME | default NOW | Waktu dibuat |
| `updated_at` | DATETIME | default NOW | Waktu diubah |

#### Tabel: `alat` (Model: `Alat`)

Sumber: `src/models/Alat.js`

| Field | Tipe | Aturan/Pembatasan | Keterangan |
| --- | --- | --- | --- |
| `id` | INT | PK, AI, NOT NULL | ID alat |
| `nama_alat` | VARCHAR(100) | NOT NULL | Nama alat |
| `kategori_id` | INT | FK → `kategori.id` | Kategori alat |
| `kondisi` | ENUM | `baik/rusak_ringan/rusak_berat` | Kondisi fisik |
| `status` | ENUM | `tersedia/dipinjam/maintenance` | Status ketersediaan |
| `stok` | INT | default 1, min 0 | Jumlah stok |
| `deskripsi` | TEXT | nullable | Deskripsi alat |
| `foto` | VARCHAR(255) | nullable | URL foto (jika dipakai) |
| `created_at` | DATETIME | default NOW | Waktu dibuat |
| `updated_at` | DATETIME | default NOW | Waktu diubah |

#### Tabel: `peminjaman` (Model: `Peminjaman`)

Sumber: `src/models/Peminjaman.js`

| Field | Tipe | Aturan/Pembatasan | Keterangan |
| --- | --- | --- | --- |
| `id` | INT | PK, AI, NOT NULL | ID transaksi |
| `user_id` | INT | FK → `users.id` | Peminjam |
| `alat_id` | INT | FK → `alat.id` | Alat dipinjam |
| `jumlah` | INT | default 1, min 1 | Jumlah dipinjam |
| `tanggal_pinjam` | DATE | NOT NULL | Tanggal mulai |
| `tanggal_kembali` | DATE | NOT NULL | Tanggal rencana kembali |
| `status` | ENUM | `pending/disetujui/dipinjam/dikembalikan/ditolak/dibatalkan` | Status transaksi |
| `tanggal_pengembalian` | DATE | nullable | Tanggal real kembali |
| `catatan` | TEXT | nullable | Catatan peminjam |
| `denda` | DECIMAL(10,2) | default 0 | Kolom denda (tersedia) |
| `created_at` | DATETIME | default NOW | Waktu dibuat |
| `updated_at` | DATETIME | default NOW | Waktu diubah |

#### Tabel: `log_aktivitas` (Model: `LogAktivitas`)

Sumber: `src/models/LogAktivitas.js`

| Field | Tipe | Aturan/Pembatasan | Keterangan |
| --- | --- | --- | --- |
| `id` | INT | PK, AI, NOT NULL | ID log |
| `user_id` | INT | FK → `users.id` | Aktor |
| `aktivitas` | TEXT | NOT NULL | Deskripsi aktivitas |
| `waktu` | DATETIME | default NOW | Waktu aktivitas |
| `ip_address` | VARCHAR(45) | nullable | IP |
| `user_agent` | TEXT | nullable | UA |
| `session_id` | VARCHAR(255) | nullable | Session ID |

### 2.2 Relasi Data (Association)

Sumber: `src/models/associations.js`

- `User (1) ---- (N) Peminjaman`
- `User (1) ---- (N) LogAktivitas`
- `Kategori (1) ---- (N) Alat`
- `Alat (1) ---- (N) Peminjaman`
- `Peminjaman (N) ---- (1) User`
- `Peminjaman (N) ---- (1) Alat`
- `LogAktivitas (N) ---- (1) User`

### 2.3 Akses Data (CRUD & Query)

#### Pola akses data

- Controller memanggil Service.
- Service memanggil Model Sequelize (`findAll`, `findByPk`, `create`, `update`, `destroy`, `findAndCountAll`).
- Beberapa Model memiliki **instance method** dan **class method** untuk query/komputasi (mis. `Peminjaman.prototype.calculateFine()`).

Contoh titik akses (berdasarkan file):

- Users: `src/services/userService.js` → `User.*`, `LogAktivitas.create()`
- Kategori: `src/services/kategoriService.js` → `Kategori.*`, `LogAktivitas.create()`
- Alat: `src/services/alatService.js` → `Alat.*`, `Kategori.findAll()`, `LogAktivitas.create()`
- Peminjaman: `src/services/peminjamanService.js` → `Peminjaman.*`, `Alat.*`, `LogAktivitas.create()`
- Report: `src/services/reportService.js` → agregasi dari model-model terkait

### 2.4 Control Program (Alur Kendali Aplikasi)

#### Entry point

- `src/app.js` menginisialisasi DB, sync schema, definisi associations, set middleware, lalu mount routes.

#### Alur request (ringkas)

1. Client mengirim request ke Express.
2. Middleware security: rate limit, headers, CSRF, sanitasi (`src/middleware/security`).
3. Session + flash message (`express-session`, `connect-flash`).
4. `req.user` di-set dari `req.session.userId` (`src/app.js`).
5. Route match (`src/routes/web.js`).
6. Middleware auth & role-check (`src/middleware/auth`).
7. Validasi input tertentu (`src/middleware/validation`, `src/middleware/routeHelpers`).
8. Controller → Service → Model → DB.
9. Render view EJS / redirect.

---

## 3) Diagram (ERD & Diagram Program)

### 3.0 ERD versi UML (PlantUML)

File PlantUML siap render via UML:

- `docs/uml/erd-esarpra.puml`

Hasil render (SVG):

- `docs/diagram/ERD eSarpra.svg`

<!-- markdownlint-disable MD033 -->
<img src="diagram/ERD%20eSarpra.svg" alt="ERD eSarpra" width="900" />
<!-- markdownlint-enable MD033 -->

### 3.1 ERD (Entity Relationship Diagram)

```mermaid
erDiagram
  USERS ||--o{ PEMINJAMAN : "memiliki"
  ALAT ||--o{ PEMINJAMAN : "dipinjam pada"
  KATEGORI ||--o{ ALAT : "mengelompokkan"
  USERS ||--o{ LOG_AKTIVITAS : "melakukan"

  USERS {
    INT id PK
    VARCHAR nama
    VARCHAR username UK
    VARCHAR email UK
    VARCHAR password
    ENUM role
    BOOLEAN is_active
    DATETIME last_login
    VARCHAR remember_token
    DATETIME remember_expires
    DATETIME created_at
    DATETIME updated_at
  }

  KATEGORI {
    INT id PK
    VARCHAR nama_kategori UK
    TEXT deskripsi
    BOOLEAN is_active
    DATETIME created_at
    DATETIME updated_at
  }

  ALAT {
    INT id PK
    VARCHAR nama_alat
    INT kategori_id FK
    ENUM kondisi
    ENUM status
    INT stok
    TEXT deskripsi
    VARCHAR foto
    DATETIME created_at
    DATETIME updated_at
  }

  PEMINJAMAN {
    INT id PK
    INT user_id FK
    INT alat_id FK
    INT jumlah
    DATE tanggal_pinjam
    DATE tanggal_kembali
    ENUM status
    DATE tanggal_pengembalian
    TEXT catatan
    DECIMAL denda
    DATETIME created_at
    DATETIME updated_at
  }

  LOG_AKTIVITAS {
    INT id PK
    INT user_id FK
    TEXT aktivitas
    DATETIME waktu
    VARCHAR ip_address
    TEXT user_agent
    VARCHAR session_id
  }
```

### 3.2 Diagram Program (Arsitektur + Alur Akses)

```mermaid
flowchart LR
  A[Browser / Client] -->|HTTP| B[Express App<br/>src/app.js]
  B --> C[Middleware Security<br/>rate limit, CSRF, sanitize]
  C --> D[Session + Flash]
  D --> E[Auth/Role Middleware<br/>src/middleware/auth]
  E --> F[Routes<br/>src/routes/web.js]
  F --> G[Controller<br/>src/controllers/*]
  G --> H[Service Layer<br/>src/services/*]
  H --> I[Sequelize Models<br/>src/models/*]
  I --> J[(MySQL Database)]
  G --> K[EJS Views<br/>src/views/*]
```

---

## 4) Flowchart & Pseudocode (Minimal)

### 4.0 Flowchart versi UML (PlantUML)

File PlantUML siap render via UML:

- `docs/uml/login-flowchart.puml`
- `docs/uml/peminjaman-flowchart.puml`
- `docs/uml/pengembalian-denda-flowchart.puml`

Hasil render (SVG):

- `docs/diagram/Flowchart - Proses Login (eSarpra).svg`
- `docs/diagram/Flowchart - Pengajuan Peminjaman Alat (eSarpra).svg`
- `docs/diagram/Flowchart - Pengembalian Alat & Perhitungan Denda (eSarpra).svg`

<!-- markdownlint-disable MD033 -->
<img src="diagram/Flowchart%20-%20Proses%20Login%20(eSarpra).svg" alt="Flowchart Login" width="900" />
<img src="diagram/Flowchart%20-%20Pengajuan%20Peminjaman%20Alat%20(eSarpra).svg" alt="Flowchart Peminjaman" width="900" />
<img src="diagram/Flowchart%20-%20Pengembalian%20Alat%20%26%20Perhitungan%20Denda%20(eSarpra).svg" alt="Flowchart Pengembalian + Denda" width="900" />
<!-- markdownlint-enable MD033 -->

### 4.1 Proses Login

#### Flowchart Login

```mermaid
flowchart TD
  L0([Mulai]) --> L1[User isi username & password]
  L1 --> L2[POST /login]
  L2 --> L3{User ada?}
  L3 -- Tidak --> Lx[Flash error: username/password salah] --> Lend([Selesai])
  L3 -- Ya --> L4[Validasi password bcrypt]
  L4 --> L5{Password benar?}
  L5 -- Tidak --> Lx --> Lend
  L5 -- Ya --> L6[Set session: userId, userRole]
  L6 --> L7[Update last_login]
  L7 --> L8{rememberMe?}
  L8 -- Ya --> L9[Generate token & set cookie]
  L8 -- Tidak --> L10[Skip]
  L9 --> L11[Redirect sesuai role]
  L10 --> L11
  L11 --> Lend
```

#### Pseudocode Login

```text
function login(username, password, rememberMe):
  user = find User where username
  if user not found: return error
  if !bcryptCompare(password, user.password): return error

  session.userId = user.id
  session.userRole = user.role
  user.last_login = now()

  if rememberMe:
    token = user.generateRememberToken()       // simpan hash ke remember_token
    setCookie("remember_token", token, 30 hari)

  save(user)
  redirectByRole(user.role)
```

Sumber implementasi: `src/controllers/userController.js` (`showLogin`, `login`, `logout`).

### 4.2 Proses Peminjaman Alat (Pengajuan oleh Peminjam)

#### Flowchart Peminjaman

```mermaid
flowchart TD
  P0([Mulai]) --> P1[User pilih alat di /alat]
  P1 --> P2[GET /peminjaman/ajukan/:id]
  P2 --> P3[Service cek ketersediaan alat]
  P3 --> P4{Tersedia?}
  P4 -- Tidak --> Perr[Tampilkan error] --> Pend([Selesai])
  P4 -- Ya --> P5[User isi form: tanggal_pinjam, tanggal_kembali, jumlah, catatan]
  P5 --> P6[POST /peminjaman/ajukan]
  P6 --> P7[Validasi required + tanggal + jumlah]
  P7 --> P8{Valid?}
  P8 -- Tidak --> Perr --> Pend
  P8 -- Ya --> P9[Create record peminjaman status=pending]
  P9 --> P10[LogAktivitas: mengajukan peminjaman]
  P10 --> P11[Redirect /peminjaman]
  P11 --> Pend
```

#### Pseudocode Peminjaman

```text
function ajukanPeminjaman(user, alat_id, tanggal_pinjam, tanggal_kembali, jumlah, catatan):
  assert required(alat_id, tanggal_pinjam, tanggal_kembali)
  jumlahPinjam = max(1, int(jumlah))

  if !alatTersedia(alat_id, jumlahPinjam): throw error
  if tanggal_pinjam < hariIni: throw error
  if tanggal_kembali <= tanggal_pinjam: throw error
  if selisihHari(tanggal_pinjam, tanggal_kembali) > 7: throw error

  peminjaman = create Peminjaman(
    user_id=user.id,
    alat_id=alat_id,
    tanggal_pinjam=tanggal_pinjam,
    tanggal_kembali=tanggal_kembali,
    jumlah=jumlahPinjam,
    catatan=catatan,
    status="pending"
  )

  create LogAktivitas(user.id, "Mengajukan peminjaman ...")
  return peminjaman
```

Sumber implementasi: `src/controllers/transaksiController.js` (`showCreate`, `create`) + `src/services/peminjamanService.js` (`checkAlatAvailability`, `create`).

### 4.3 Proses Pengembalian Alat & Perhitungan Denda

Catatan implementasi:

- Pengembalian dikonfirmasi oleh **petugas** via `POST /petugas/kembali/:id` (`src/controllers/transaksiController.js#returnItem`).
- Perhitungan denda tersedia sebagai **metode komputasi** di model `Peminjaman`:
  - `Peminjaman.prototype.getDaysOverdue()`
  - `Peminjaman.prototype.calculateFine()` (Rp 5000/hari)
  - Nilai tersebut juga diekspos lewat `toJSON()` sebagai `fine_amount`.
- Kolom `peminjaman.denda` tersedia, namun pada implementasi saat ini denda **belum disimpan** saat pengembalian (denda dihitung sebagai nilai turunan/computed).

#### Flowchart Pengembalian

```mermaid
flowchart TD
  R0([Mulai]) --> R1[Petugas pilih transaksi di /petugas]
  R1 --> R2[POST /petugas/kembali/:id]
  R2 --> R3[Load peminjaman + relasi user & alat]
  R3 --> R4{Status disetujui/dipinjam?}
  R4 -- Tidak --> Rerr[Error: status tidak valid] --> Rend([Selesai])
  R4 -- Ya --> R5[Set status=dikembalikan, tanggal_pengembalian=hari ini]
  R5 --> R6["Tambah stok alat + update status alat<br/>(tersedia atau dipinjam)"]
  R6 --> R7["Hitung keterlambatan<br/>daysOverdue = max(0, today - tanggal_kembali)"]
  R7 --> R8["Hitung denda<br/>fine = daysOverdue * 5000"]
  R8 --> R9[LogAktivitas: konfirmasi pengembalian]
  R9 --> R10[Redirect /petugas]
  R10 --> Rend
```

#### Pseudocode Pengembalian

```text
function konfirmasiPengembalian(petugas, peminjaman_id):
  peminjaman = load Peminjaman by id (include user, alat)
  if peminjaman.status not in ["disetujui", "dipinjam"]:
    throw error

  peminjaman.status = "dikembalikan"
  peminjaman.tanggal_pengembalian = today()

  // Update stok alat
  alat = load Alat(peminjaman.alat_id)
  alat.stok += peminjaman.jumlah
  if alat.status == "dipinjam" and alat.stok > 0:
    alat.status = "tersedia"
  save(alat)

  // Denda (computed)
  daysOverdue = peminjaman.getDaysOverdue()
  fine = peminjaman.calculateFine()     // daysOverdue * 5000

  log(petugas.id, "Mengkonfirmasi pengembalian ...")
  save(peminjaman)
  return { peminjaman, fine }
```

Sumber implementasi: `src/services/peminjamanService.js` (`returnItem`) + `src/models/Peminjaman.js` (fine computation).

---

## 5) Dokumentasi Modul (Input-Proses-Output)

Berikut dokumentasi modul sesuai pembagian fungsi pada repo.

### 5.1 Modul Autentikasi & Otorisasi

#### Rute utama Autentikasi

- `GET /login`, `POST /login`, `POST /logout` (`src/routes/web.js`)

#### Input Autentikasi

- `username`, `password`, `rememberMe` (opsional)

#### Proses Autentikasi

- Validasi akun dan password dengan bcrypt.
- Set session (`req.session.userId`, `req.session.userRole`).
- Redirect berdasarkan role.
- Logout: hapus session + clear cookie remember token.

#### Output Autentikasi

- Redirect ke dashboard sesuai role (admin/petugas/peminjam) atau kembali ke login dengan error.

#### Fungsi/Method terkait Autentikasi

- `src/controllers/userController.js`: `showLogin()`, `login()`, `logout()`
- `src/models/User.js`: `comparePassword()`, `generateRememberToken()`, `validateRememberToken()`
- `src/middleware/auth.js`: `isAuthenticated`, `requireAdmin`, `requirePetugas`, `requirePeminjam`

### 5.2 Modul Manajemen Kategori (Admin)

#### Rute utama Kategori

- `/admin/kategori` (index), `/admin/kategori/tambah`, `/admin/kategori/edit/:id`, `/admin/kategori/hapus/:id`

#### Input Kategori

- `nama_kategori`, `deskripsi`

#### Proses Kategori

- Validasi form (middleware route helper).
- CRUD kategori via `kategoriService`.
- Log aktivitas admin.

#### Output Kategori

- Tampilan daftar kategori / form create/edit; perubahan tersimpan di DB.

#### Fungsi/Method terkait Kategori

- `src/controllers/kategoriController.js`: `index()`, `showCreate()`, `create()`, `showEdit()`, `update()`, `destroy()`
- `src/services/kategoriService.js`: `getAll()`, `create()`, `update()`, `delete()`
- `src/models/Kategori.js`: schema + `getKategoriStats()`

### 5.3 Modul Manajemen Alat (Admin) + Daftar Alat (Peminjam)

#### Rute utama Alat

- Peminjam: `GET /alat`
- Admin: `GET /admin/alat`, `GET/POST /admin/alat/tambah`, `GET/POST /admin/alat/edit/:id`, `POST /admin/alat/hapus/:id`

#### Input Alat

- `nama_alat`, `kategori_id`, `kondisi`, `status` (admin update), `stok`, (opsional) `deskripsi`, `foto`

#### Proses Alat

- Peminjam hanya melihat alat `status=tersedia` (di service).
- Admin melakukan CRUD alat.
- Konsistensi stok/status dijaga oleh validasi model.
- Log aktivitas admin.

#### Output Alat

- Daftar alat; data alat tersimpan/terubah/terhapus di DB.

#### Fungsi/Method terkait Alat

- `src/controllers/alatController.js`: `index()`, `adminIndex()`, `showCreate()`, `create()`, `showEdit()`, `update()`, `destroy()`
- `src/services/alatService.js`: `getAllAvailable()`, `getAllForAdminPaginated()`, `create()`, `update()`, `delete()`
- `src/models/Alat.js`: `isAvailable()`, `canBeBorrowed()`

### 5.4 Modul Peminjaman (Peminjam)

#### Rute utama Peminjaman

- `GET /peminjaman` (riwayat)
- `GET /peminjaman/ajukan/:id` (form)
- `POST /peminjaman/ajukan` (submit)
- `POST /peminjaman/batal/:id` (batal)

#### Input Peminjaman

- `alat_id`, `tanggal_pinjam`, `tanggal_kembali`, `jumlah`, `catatan` (opsional)

#### Proses Peminjaman

- Validasi required, tanggal, dan jumlah (middleware).
- Cek stok + status alat.
- Buat record peminjaman status `pending`.
- Cache invalidation (alat/peminjaman/home).
- Log aktivitas peminjam.

#### Output Peminjaman

- Riwayat peminjaman (tabel) dan status transaksi.

#### Fungsi/Method terkait Peminjaman

- `src/controllers/transaksiController.js`: `userIndex()`, `showCreate()`, `create()`, `cancel()`
- `src/services/peminjamanService.js`: `checkAlatAvailability()`, `create()`, `cancel()`

### 5.5 Modul Persetujuan & Pengembalian (Petugas)

#### Rute utama Persetujuan & Pengembalian

- `GET /petugas` (dashboard peminjaman aktif)
- `POST /petugas/setujui/:id`
- `POST /petugas/tolak/:id`
- `POST /petugas/kembali/:id`

#### Input Persetujuan & Pengembalian

- `id` peminjaman dari parameter route

#### Proses Persetujuan & Pengembalian

- Approve:
  - Hanya `pending`.
  - Update status peminjaman → `disetujui`.
  - Kurangi stok alat; bila stok menjadi 0 maka status alat → `dipinjam`.
- Reject:
  - Hanya `pending`.
  - Update status peminjaman → `ditolak`.
- Return:
  - Status harus `disetujui` atau `dipinjam`.
  - Update status peminjaman → `dikembalikan` dan set `tanggal_pengembalian`.
  - Tambah stok alat; bila sebelumnya `dipinjam` dan stok > 0 maka status alat → `tersedia`.

#### Output Persetujuan & Pengembalian

- Dashboard petugas diperbarui; flash message sukses/gagal.

#### Fungsi/Method terkait Persetujuan & Pengembalian

- `src/controllers/transaksiController.js`: `petugasIndex()`, `approve()`, `reject()`, `returnItem()`
- `src/services/peminjamanService.js`: `getForPetugas()`, `approve()`, `reject()`, `returnItem()`
- `src/models/Peminjaman.js`: `isOverdue()`, `getDaysOverdue()`, `calculateFine()`

### 5.6 Modul Admin Dashboard, User, Log Aktivitas, dan Laporan

#### Rute utama Dashboard, User, Log & Laporan

- Dashboard admin: `GET /admin`
- Manajemen user: `GET /admin/user`, `GET/POST /admin/user/tambah`, `POST /admin/user/hapus/:id`
- Log aktivitas: `GET /admin/catatan`
- Laporan admin: `GET /admin/laporan/*`
- Laporan petugas: `GET /laporan/*`

#### Input Dashboard, User, Log & Laporan

- Form user: `nama`, `username`, `email`, `password`, `role`
- Filter laporan (opsional): `start_date`, `end_date` (query string)

#### Proses Dashboard, User, Log & Laporan

- Dashboard: ambil statistik dari service (dengan cache).
- User: create/delete non-admin, log aktivitas.
- Log: tampilkan `log_aktivitas` join `users`.
- Laporan: generate agregasi dari service report, render view laporan.

#### Output Dashboard, User, Log & Laporan

- Halaman dashboard, daftar user, log aktivitas, laporan.

#### Fungsi/Method terkait Dashboard, User, Log & Laporan

- `src/controllers/adminController.js`: `dashboard()`, `userIndex()`, `createUser()`, `destroyUser()`, `logIndex()`, `reportIndex()`, `petugasReportIndex()`, `generate*()`
- `src/services/userService.js`: `getDashboardStats()`, `getAllUsersPaginated()`, `create()`, `delete()`, `getActivityLogs()`
- `src/services/reportService.js`: `generateReportDashboard()`, `generateUserReport()`, `generateInventoryReport()`, `generatePeminjamanReport()`, `generateActivityReport()`, `generateStatistics()`

---

## 6) Lampiran: Daftar Route (Ringkas)

Sumber: `src/routes/web.js`

### Public

- `GET /`, `GET /home`
- `GET /login`, `POST /login`
- `GET /register`, `POST /register`
- `POST /logout`

### Peminjam (auth + role peminjam)

- `GET /dasbor` (redirect ke `/alat`)
- `GET /alat`
- `GET /peminjaman`
- `GET /peminjaman/ajukan/:id`
- `POST /peminjaman/ajukan`
- `POST /peminjaman/batal/:id`

### Petugas (auth + role petugas)

- `GET /petugas`
- `POST /petugas/setujui/:id`
- `POST /petugas/tolak/:id`
- `POST /petugas/kembali/:id`

### Admin (auth + role admin)

- `GET /admin`
- Kategori: `/admin/kategori*`
- Alat: `/admin/alat*`
- Peminjaman: `GET /admin/peminjaman`
- User: `/admin/user*`
- Catatan: `GET /admin/catatan`
- Laporan admin: `GET /admin/laporan*`
