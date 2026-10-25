import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { loadResumeTemplate, renderPrivateResume } from "../resume-template.mjs";

const siteRoot = await realpath(fileURLToPath(new URL("..", import.meta.url)));
const privateRoot = resolve(process.env.RESUME_PRIVATE_DIR || resolve(siteRoot, "../.vzhang-private"));
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
const location = relative(siteRoot, await realpath(privateRoot));
if (location === "" || (!location.startsWith("..") && !isAbsolute(location))) throw new Error("Private output must be outside the website.");
await chmod(privateRoot, 0o700);
const detailsPath = await realpath(resolve(privateRoot, "resume-details.json"));
const template = await loadResumeTemplate(siteRoot, detailsPath);
const chrome = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const manifest = { fingerprint: template.fingerprint, pdfs: {} };
for (const language of ["zh", "en"]) {
  const htmlPath = resolve(privateRoot, `resume-current-${language}.html`);
  const pdfPath = resolve(privateRoot, `resume-current-${language}.pdf`);
  await writeFile(htmlPath, renderPrivateResume(template, language), { mode: 0o600 });
  await promisify(execFile)(chrome, [
    "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-extensions", "--no-pdf-header-footer",
    `--user-data-dir=${resolve(privateRoot, "render-profile")}`,
    `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href
  ], { timeout: 60000, maxBuffer: 1024 * 1024 });
  await chmod(pdfPath, 0o600);
  const bytes = await readFile(pdfPath);
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("PDF generation failed.");
  manifest.pdfs[language] = createHash("sha256").update(bytes).digest("hex");
}
await writeFile(resolve(privateRoot, "resume-manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
console.log("Built Chinese and English private PDFs from the website template. No private content was published.");

