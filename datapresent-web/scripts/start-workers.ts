import { getGenerateWorker } from "../src/lib/queue/workers/generate.worker";
import { getExportWorker } from "../src/lib/queue/workers/export.worker";

async function start() {
  const generateWorker = await getGenerateWorker();
  const exportWorker = await getExportWorker();

  console.log("🚀 Workers started:", new Date().toISOString());
  console.log("📊 Generate worker ready");
  console.log("📦 Export worker ready");

  const cleanup = async () => {
    console.log("🛑 Shutting down workers...");
    await generateWorker.close();
    await exportWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}

start();
