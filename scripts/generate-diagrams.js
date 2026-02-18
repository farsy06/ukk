const fs = require("fs");
const path = require("path");
const https = require("https");

const repoRoot = path.resolve(__dirname, "..");
const umlDir = path.join(repoRoot, "docs", "uml");
const diagramDir = path.join(repoRoot, "docs", "diagram");

const mapping = [
  ["erd-esarpra.puml", "ERD eSarpra.svg"],
  ["login-flowchart.puml", "Flowchart - Proses Login (eSarpra).svg"],
  [
    "peminjaman-flowchart.puml",
    "Flowchart - Pengajuan Peminjaman Alat (eSarpra).svg",
  ],
  [
    "pengembalian-denda-flowchart.puml",
    "Flowchart - Pengembalian Alat & Perhitungan Denda (eSarpra).svg",
  ],
];

const postToKroki = (umlSource) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "kroki.io",
        path: "/plantuml/svg",
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Length": Buffer.byteLength(umlSource, "utf8"),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(
              new Error(
                `Kroki request failed with status ${res.statusCode}: ${body.toString("utf8")}`,
              ),
            );
          }
          resolve(body.toString("utf8"));
        });
      },
    );

    req.on("error", reject);
    req.write(umlSource);
    req.end();
  });

async function main() {
  if (!fs.existsSync(diagramDir)) {
    fs.mkdirSync(diagramDir, { recursive: true });
  }

  for (const [srcName, outName] of mapping) {
    const srcPath = path.join(umlDir, srcName);
    const outPath = path.join(diagramDir, outName);

    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing source file: ${srcPath}`);
    }

    const umlSource = fs.readFileSync(srcPath, "utf8");
    const svg = await postToKroki(umlSource);
    fs.writeFileSync(outPath, svg, "utf8");
    console.log(`generated: ${path.relative(repoRoot, outPath)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
