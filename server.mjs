import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeBase32, matchCode } from "./totp.mjs";
import { loadResumeTemplate } from "./resume-template.mjs";

const siteRoot = await realpath(fileURLToPath(new URL(".", import.meta.url)));
const privateRoot = resolve(siteRoot, "../.vzhang-private");
const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || "127.0.0.1";
const allowedOrigin = process.env.SITE_ORIGIN || `http://127.0.0.1:${port}`;
const maximumAttempts = 5;
const windowLength = 15 * 60 * 1000;
const attempts = new Map();

function isInsideSite(path) {
  const location = relative(siteRoot, path);
  return location === "" || (!location.startsWith("..") && !isAbsolute(location));
}

const secretPath = await realpath(resolve(process.env.RESUME_TOTP_SECRET_FILE || resolve(privateRoot, "authenticator-secret.txt")));
if (isInsideSite(secretPath)) throw new Error("Keep private files outside the website directory.");
const documentRoot = await realpath(resolve(process.env.RESUME_PRIVATE_DIR || privateRoot));
if (isInsideSite(documentRoot)) throw new Error("Keep private documents outside the website directory.");
const detailsPath = await realpath(resolve(documentRoot, "resume-details.json"));
if (isInsideSite(detailsPath)) throw new Error("Keep private details outside the website directory.");
const manifest = JSON.parse(await readFile(resolve(documentRoot, "resume-manifest.json"), "utf8"));
const template = await loadResumeTemplate(siteRoot, detailsPath);
if (manifest.fingerprint !== template.fingerprint) throw new Error("Website content changed. Run node tools/build-resume.mjs before starting.");
const documents = {};
for (const language of ["zh", "en"]) {
  const pdfPath = await realpath(resolve(documentRoot, `resume-current-${language}.pdf`));
  if (isInsideSite(pdfPath)) throw new Error("Keep PDF files outside the website directory.");
  const bytes = await readFile(pdfPath);
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-" || bytes.length > 24 * 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== manifest.pdfs[language]) throw new Error("Private PDF does not match the template manifest.");
  documents[language] = bytes;
}
const secret = decodeBase32((await readFile(secretPath, "utf8")).trim());
const secretFingerprint = createHash("sha256").update(secret).digest("hex");
const stateDirectory = resolve(process.env.RESUME_STATE_DIR || privateRoot);
await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
if (isInsideSite(await realpath(stateDirectory))) throw new Error("Keep authenticator state outside the website directory.");
const statePath = resolve(stateDirectory, "authenticator-state.json");
let lastCounter = -1;
try {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.secretFingerprint !== secretFingerprint || !Number.isSafeInteger(state.lastCounter) || state.lastCounter < -1) throw new Error("Invalid authenticator state; check private configuration before starting.");
  lastCounter = state.lastCounter;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
let verificationQueue = Promise.resolve();

function verifyAccess(code, address) {
  const verification = verificationQueue.then(async () => {
    const now = Date.now();
    const record = attempts.get(address);
    if (record && record.expires > now && record.count >= maximumAttempts) return "limited";
    const matchedCounter = matchCode(secret, code, now);
    if (matchedCounter === null || matchedCounter <= lastCounter) {
      const next = record && record.expires > now ? record : { count: 0, expires: now + windowLength };
      next.count += 1;
      attempts.set(address, next);
      return "incorrect";
    }
    const temporaryPath = `${statePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ secretFingerprint, lastCounter: matchedCounter }), { mode: 0o600 });
    await rename(temporaryPath, statePath);
    lastCounter = matchedCounter;
    attempts.delete(address);
    return "accepted";
  });
  verificationQueue = verification.catch(() => {});
  return verification;
}

const publicFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
  ["/assets/favicon.svg", ["assets/favicon.svg", "image/svg+xml"]]
]);

function json(response, status, message) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: message }));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2048) throw new Error("body-too-large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleRequest(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/api/resume") {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return json(response, 405, "method-not-allowed");
    }
    if (url.search) return json(response, 400, "invalid-request");
    if ((request.headers.origin && request.headers.origin !== allowedOrigin) || request.headers["sec-fetch-site"] === "cross-site") return json(response, 403, "forbidden");
    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) return json(response, 415, "json-required");
    const address = request.socket.remoteAddress;
    const now = Date.now();
    const record = attempts.get(address);
    if (record && record.expires > now && record.count >= maximumAttempts) {
      response.setHeader("Retry-After", String(Math.ceil((record.expires - now) / 1000)));
      return json(response, 429, "too-many-attempts");
    }
    let body;
    try { body = await readBody(request); } catch (error) {
      return json(response, error.message === "body-too-large" ? 413 : 400, "invalid-request");
    }
    if ((await loadResumeTemplate(siteRoot, detailsPath)).fingerprint !== manifest.fingerprint) return json(response, 503, "resume-update-required");
    const pdfBytes = documents[body?.language === "en" ? "en" : "zh"];
    const candidate = typeof body?.code === "string" && body.code.length === 6 ? body.code : "";
    if (body && typeof body === "object") body.code = "";
    const verification = await verifyAccess(candidate, address);
    if (verification === "limited") {
      response.setHeader("Retry-After", "900");
      return json(response, 429, "too-many-attempts");
    }
    if (verification !== "accepted") return json(response, 401, "invalid-or-used-code");
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="V-Zhang-Resume.pdf"',
      "Content-Length": pdfBytes.length,
      "X-Robots-Tag": "noindex, noarchive, nosnippet"
    });
    return response.end(pdfBytes);
  }
  if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, "method-not-allowed");
  const publicFile = publicFiles.get(url.pathname);
  if (!publicFile) return json(response, 404, "not-found");
  const path = await realpath(resolve(siteRoot, publicFile[0]));
  if (!isInsideSite(path)) return json(response, 404, "not-found");
  response.setHeader("Content-Type", publicFile[1]);
  if (request.method === "HEAD") {
    response.setHeader("Content-Length", (await stat(path)).size);
    return response.end();
  }
  response.end(await readFile(path));
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) json(response, 500, "unavailable");
    else response.end();
  });
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
setInterval(() => {
  const now = Date.now();
  for (const [address, record] of attempts) if (record.expires <= now) attempts.delete(address);
}, 60000).unref();
server.listen(port, host, () => console.log(`Website ready: http://${host}:${port} (private PDF requires an authenticator code)`));
