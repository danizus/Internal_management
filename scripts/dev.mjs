import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const api = spawn(npmCmd, ["run", "dev", "-w", "apps/api"], {
  stdio: "inherit",
  shell: isWin,
});

const web = spawn(npmCmd, ["run", "dev", "-w", "apps/web"], {
  stdio: "inherit",
  shell: isWin,
});

function cleanup() {
  if (!api.killed) api.kill();
  if (!web.killed) web.kill();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
