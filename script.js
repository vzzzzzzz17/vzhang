"use strict";

const english = {
  skip: "Skip to main content",
  name: "V Zhang",
  headline: "AI Application Engineer · LLM Applications / AI Infra",
  newTab: " (opens in a new tab)",
  phoneLabel: "Phone: ",
  emailLabel: "Email: ",
  education: "Education",
  masters: "MSc · Artificial Intelligence",
  bachelors: "BEng · Software Engineering",
  toolsLabel: "Résumé tools",
  downloadResume: "Download résumé",
  experience: "Experience",
  current: "Current",
  currentRole: "AI Application Engineer",
  currentDescription: "Lead AI application design and delivery across model access, agent architecture, Prompt / MCP / Skills management, evaluation, deployment, and service governance. Build LLM platform capabilities for routing, quotas, authentication, reliability, and cost allocation; drive AI adoption in assistants, knowledge, operations, and business tools.",
  platformRole: "Machine Learning Platform Engineer",
  platformDescription: "Led the machine learning platform project and built AI infrastructure from zero to one. Connected training submission, Harbor image registry, Rancher cluster management, annotation, datasets, model inference, release workflows, and Prometheus monitoring and alerts.",
  reinforcementRole: "AI Application Engineer",
  reinforcementDescription: "Developed machine learning platform capabilities for reinforcement learning scenarios.",
  internships: "Internships",
  systemOptimization: "responsible for CPU instruction-set optimization.",
  trafficAnalysis: "using AI to detect anomalous network traffic.",
  automationProjects: "responsible for AI factory automation and AI infrastructure development.",
  projects: "Projects",
  employeeAssistantTitle: "OpenClaw Employee AI Assistant",
  clawArchitecture: "Adapted OpenClaw from a local client into a 24-hour cloud assistant, integrating the enterprise Skill Hub, Web UI, cloud-browser mapping, and Feishu; formally rolled out for use.",
  clawUsage: "Supports automated log analysis, alert handling, and operations on Feishu documents and multidimensional tables.",
  judgeContext: "Business Q&A evaluation system",
  judgeDataset: "For corporate-client Q&A scenarios, collected anonymized real user questions and built an evaluation dataset to compare the business performance of different agent frameworks.",
  judgeMethod: "Applied predefined criteria to automatically score correctness, completeness, relevance, and response quality with reasons; used human sampling review to support comparison and iteration across models, agent approaches, and prompt versions.",
  proxyContext: "Company-wide multi-protocol LLM gateway",
  gatewayCapabilities: "Global multi-region deployment",
  gatewayRouting: "supports cross-region request forwarding, remote model invocation, session affinity, fallback failover, and cost- and quality-aware routing; covers text, image, audio, video, and TTS multimodal capabilities.",
  gatewayImpact: "Production QPS peaks in the thousands, serving as the foundation for the company-wide AI capabilities.",
  gatewayObservability: "Built end-to-end Trace and service-governance capabilities for request troubleshooting, model-effect analysis, and runtime monitoring.",
  gatewayCost: "Established API-Key-level usage metering, cost reconciliation, and chargeback across users, business projects, and departments.",
  difyContext: "Open-source LLM application platform · Customization",
  difyCapabilities: "Integrated model providers including OpenAI, Google, and AWS, and delivered Chat Assistant, Workflow, RAG, and Agent capabilities internally.",
  difyRollout: "Led enterprise customization and internal rollout, creating reusable AI application-building capabilities.",
  labelContext: "Open-source annotation platform · Customization",
  labelDescription: "Extended image and video annotation to 3D panoramas with Three.js, used quaternion interpolation to address gimbal lock, and expanded backend permission management.",
  labelInnovation: "Designed and delivered an innovative 3D panoramic image, video, and AI annotation-data solution, ",
  labelMetric: "helping the company build globally leading AI panoramic video-editing capabilities",
  kubeflowContext: "Open-source ML platform · Customization",
  kubeflowOutcome: "Automated the end-to-end machine learning lifecycle",
  kubeflowDescription: ". Implemented GPU sharing and isolation, MiB-level scheduling, NVIDIA GPU Operator, Gang / Volcano scheduling, distributed training, pipeline orchestration, inference, and online serving. Built monitoring, Feishu alerts, and image snapshots.",
  disclosure: "Outcomes are based on my résumé. Open-source links point to upstream repositories; my work is platform customization. Internal source code and business data are not public.",
  skills: "Technical Skills",
  languages: "Languages / Backend: ",
  inference: "Training / Inference: ",
  infrastructure: "Infrastructure: ",
  monitoring: "Monitoring / Engineering: ",
  systems: "concurrency, load balancing, distributed systems",
  frontend: "Frontend: ",
  about: "About",
  aboutDescription: "Passionate about exploring and learning in AI. I focus on clear interfaces, reliable services, measurable model quality, and infrastructure that makes AI easier to use at scale.",
  privateTitle: "View full details · Download résumé",
  closeDialog: "Close",
  passwordLabel: "Enter the 6-digit code",
  codeHint: "Ask the owner for the current Google Authenticator code.",
  unlockDownload: "Verify & download",
  privacyFooter: "Full résumé available only after code verification"
};

const translatedElements = document.querySelectorAll("[data-i18n], [data-i18n-aria]");
const chinese = {};
const privateLabels = new Map([...document.querySelectorAll("[data-private]")].map((element) => [element, element.textContent]));
translatedElements.forEach((element) => {
  const key = element.dataset.i18n || element.dataset.i18nAria;
  if (!(key in chinese)) chinese[key] = element.dataset.i18nAria ? element.getAttribute("aria-label") : element.innerHTML;
});

let language = "zh";
try { language = localStorage.getItem("vzhang-language") === "en" ? "en" : "zh"; } catch {}

function applyLanguage(nextLanguage) {
  language = nextLanguage;
  const translations = language === "en" ? english : chinese;
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  translatedElements.forEach((element) => {
    const key = element.dataset.i18n || element.dataset.i18nAria;
    if (!(key in translations)) return;
    if (element.dataset.i18nAria) element.setAttribute("aria-label", translations[key]);
    else if (language === "zh") element.innerHTML = translations[key];
    else element.textContent = translations[key];
  });
  const hiddenLabels = { phone: "Private", email: "Private", mastersSchool: "School not disclosed", bachelorsSchool: "School not disclosed", currentCompany: "Company not disclosed", platformCompany: "Company not disclosed", reinforcementCompany: "Company not disclosed", systemsCompany: "Employer not disclosed", automationCompany: "Employer not disclosed", systemsProject: "Open-source system", trafficProject: "Traffic analysis system", automationProjects: "Automation projects", assistantProject: "Internal project", qualityProject: "Internal project", billingProject: "internal AI tools" };
  privateLabels.forEach((label, element) => {
    if (element.dataset.private !== "name") element.textContent = language === "en" ? hiddenLabels[element.dataset.private] || label : label;
  });
  const toggle = document.getElementById("language-toggle");
  toggle.textContent = language === "en" ? "中文" : "EN";
  toggle.setAttribute("aria-label", language === "en" ? "切换到中文" : "Switch to English");
  document.title = "V Zhang · AI Engineer";
  const description = language === "en"
    ? "V Zhang — AI Application Engineer. Experience, projects, and technical skills. Full résumé requires an authenticator code."
    : "V Zhang 的个人网站。AI 应用工程师，专注 LLM 应用、Agent 与机器学习基础设施。";
  document.querySelector('meta[name="description"]').content = description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content = description;
  document.getElementById("download-status").textContent = "";
  try { localStorage.setItem("vzhang-language", language); } catch {}
}

document.getElementById("language-toggle").addEventListener("click", () => applyLanguage(language === "en" ? "zh" : "en"));
const downloadDialog = document.getElementById("download-dialog");
document.getElementById("open-download-dialog").addEventListener("click", () => {
  downloadDialog.showModal();
  document.getElementById("resume-password").focus();
});
document.getElementById("close-download-dialog").addEventListener("click", () => downloadDialog.close());
downloadDialog.addEventListener("click", (event) => {
  if (event.target === downloadDialog) downloadDialog.close();
});
let downloading = false;

function downloadMessage(key) {
  const messages = {
    working: ["正在校验验证码…", "Checking code…"],
    ready: ["验证成功，已开始下载。", "Code accepted. Download started."],
    incorrect: ["验证码不正确、已过期或已使用，请索取最新验证码。", "Invalid, expired, or already used code. Please request a new code."],
    unavailable: ["简历暂时无法下载，请稍后重试。", "The résumé is unavailable. Please try again later."],
    rateLimit: ["尝试次数过多，请 15 分钟后重试。", "Too many attempts. Please try again in 15 minutes."]
  };
  return messages[key][language === "en" ? 1 : 0];
}

document.getElementById("resume-access-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (downloading) return;
  const status = document.getElementById("download-status");
  const input = document.getElementById("resume-password");
  const button = document.getElementById("download-resume");
  if (!input.checkValidity()) {
    input.reportValidity();
    return;
  }
  downloading = true;
  input.disabled = true;
  button.disabled = true;
  document.getElementById("resume-access-form").setAttribute("aria-busy", "true");
  status.textContent = downloadMessage("working");
  let code = input.value;
  input.value = "";
  let pdfBytes;
  try {
    const response = await fetch("./api/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(response.status === 401 ? "incorrect" : response.status === 429 ? "rateLimit" : "unavailable");
    if (!response.headers.get("Content-Type")?.startsWith("application/pdf")) throw new Error("unavailable");
    pdfBytes = new Uint8Array(await response.arrayBuffer());
    if (new TextDecoder().decode(pdfBytes.slice(0, 5)) !== "%PDF-") throw new Error("unavailable");
    const objectURL = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = objectURL;
    anchor.download = "V-Zhang-Resume.pdf";
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
    }
    status.textContent = downloadMessage("ready");
    input.removeAttribute("aria-invalid");
  } catch (error) {
    const incorrect = error.message === "incorrect";
    status.textContent = downloadMessage(incorrect ? "incorrect" : error.message === "rateLimit" ? "rateLimit" : "unavailable");
    if (incorrect) input.setAttribute("aria-invalid", "true");
  } finally {
    code = "";
    pdfBytes?.fill(0);
    input.disabled = false;
    button.disabled = false;
    downloading = false;
    document.getElementById("resume-access-form").removeAttribute("aria-busy");
    input.focus();
  }
});
document.getElementById("year").textContent = String(new Date().getFullYear());
applyLanguage(language);
