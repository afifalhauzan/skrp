# PyScaffold

Prototype media pembelajaran algoritma dan Python berbasis Next.js App Router.

## Menjalankan lokal

```bash
pnpm install
pnpm dev
```

Pemeriksaan yang tersedia:

```bash
pnpm typecheck
pnpm build
```

Kode akses mock: `PY2026`, `BELAJAR`, atau `MALANG`.

## Rute

- `/` — landing dan entry point
- `/login` — validasi kode akses mock
- `/mission` — briefing Kasus 1
- `/learn/[caseId]/[stageId]` — workspace bersama untuk empat tahap
- `/case-review/[caseId]` — evaluasi dan routing fixture
- `/final-review` — ringkasan, strengths, dan refleksi

## Arsitektur

Domain types dan fixture berada di `src/lib`; persistence browser berada di `src/lib/persistence.ts`, sehingga komponen tidak bergantung pada storage tertentu. `Workspace` digunakan semua kasus dan tahap, dengan stage-specific controls yang tetap dapat diedit.

State prototype disimpan di `localStorage` dengan key `pyscaffold-progress-v1`. Ini bukan persistence atau security production. Model Prisma/PostgreSQL provisional tersedia di `prisma/schema.prisma` dan tidak diperlukan untuk menjalankan UI.

## Mock dan keterbatasan

- Eksekusi Python dan test runner sengaja berupa hasil simulasi yang diberi label jelas; tidak ada Python sandbox atau AI API.
- Routing kasus menggunakan fixture tetap (Kasus 1 → 2 → 3), karena PRD belum menetapkan rubric numerik atau ambang routing.
- Pseudocode adalah editor teks; flowchart memakai editor drag-and-drop React Flow; datanya JSON `{nodes, edges}` di `progress.flowchart[caseId]`, draf dari BE/AI cukup mengisi struktur yang sama (lihat `flowchartDrafts` di `mock-data.ts`); riwayat revisi penuh menjadi pekerjaan lanjutan.
- Figma MCP tersedia di `.vscode/mcp.json`; frame desktop terpilih digunakan sebagai referensi komposisi, sementara node berisi beberapa frame aplikasi.
