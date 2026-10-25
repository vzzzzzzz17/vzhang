import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

export async function loadResumeTemplate(siteRoot, detailsPath) {
  const [html, css, script, detailsText] = await Promise.all([
    readFile(resolve(siteRoot, "index.html"), "utf8"),
    readFile(resolve(siteRoot, "styles.css"), "utf8"),
    readFile(resolve(siteRoot, "script.js"), "utf8"),
    readFile(detailsPath, "utf8")
  ]);
  const fingerprint = createHash("sha256").update(JSON.stringify([html, css, script, detailsText])).digest("hex");
  const details = JSON.parse(detailsText);
  const translationSource = script.split("const translatedElements")[0];
  const english = runInNewContext(`${translationSource}\nenglish;`, {}, { timeout: 1000 });
  return { html, css, details, english, fingerprint };
}

function escapeText(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function renderPrivateResume(template, language = "zh") {
  let html = template.html;
  if (language === "en") {
    html = html.replace(/<([a-z][a-z0-9]*)\b([^>]*\bdata-i18n="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g, (match, tag, attributes, key) => {
      if (!(key in template.english)) throw new Error(`Missing translation: ${key}`);
      return `<${tag}${attributes}>${escapeText(template.english[key])}</${tag}>`;
    });
    html = html.replace('lang="zh-CN"', 'lang="en"');
  }
  html = html.replace(/<([a-z][a-z0-9]*)\b([^>]*\bdata-private="([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g, (match, tag, attributes, key) => {
    const value = language === "en" ? template.details[`${key}English`] || template.details[key] : template.details[key];
    if (typeof value !== "string" || !value) throw new Error(`Missing private field: ${key}`);
    return `<${tag}${attributes}>${escapeText(value)}</${tag}>`;
  });
  html = html.replace('<body>', '<body class="private-document">');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  html = html.replace(/<link\b[^>]*>/g, "");
  html = html.replace(/<dialog\b[^>]*id="download-dialog"[\s\S]*?<\/dialog>/, "");
  html = html.replace(/<div class="page-tools"[\s\S]*?<\/div>/, "");
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/, "");
  html = html.replace("</head>", `<style>${template.css}</style></head>`);
  return html;
}
