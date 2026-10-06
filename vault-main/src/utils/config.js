import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_DIR = path.join(os.homedir(), ".hyperiux");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function saveToken(token) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify({ token }, null, 2),
    "utf-8"
  );
}

export function getToken() {
  if (process.env.HYPERIUX_TOKEN) {
    return process.env.HYPERIUX_TOKEN;
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    return config.token || null;
  } catch {
    return null;
  }
}