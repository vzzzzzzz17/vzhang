import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeBase32, encodeBase32 } from "../totp.mjs";

const siteRoot = await realpath(fileURLToPath(new URL("..", import.meta.url)));
const privateRoot = resolve(siteRoot, "../.vzhang-private");
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
const location = relative(siteRoot, await realpath(privateRoot));
if (location === "" || (!location.startsWith("..") && !isAbsolute(location))) throw new Error("Keep authenticator setup outside the website directory.");
await chmod(privateRoot, 0o700);
const secretPath = resolve(privateRoot, "authenticator-secret.txt");
try {
  await writeFile(secretPath, `${encodeBase32(randomBytes(20))}\n`, { flag: "wx", mode: 0o600 });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
await chmod(secretPath, 0o600);
const secret = (await readFile(secretPath, "utf8")).trim();
decodeBase32(secret).fill(0);
const uri = `otpauth://totp/V%20Zhang:Resume?secret=${secret}&issuer=V%20Zhang&algorithm=SHA1&digits=6&period=30`;
await writeFile(resolve(privateRoot, "authenticator-uri.txt"), uri, { mode: 0o600 });
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>V Zhang · 私有验证器绑定</title><style>body{max-width:640px;margin:48px auto;padding:0 24px;font:15px/1.9 -apple-system,sans-serif;color:#252525}h1{font-size:23px}img{display:block;width:240px;height:240px}code{font-size:17px;overflow-wrap:anywhere;background:#f3f3f3;padding:8px}strong{color:#b33028}</style></head>
<body><h1>Google Authenticator · 绑定简历验证码</h1><p><strong>仅供本人设置：本页和二维码包含验证器密钥，请勿上传、截图分享或发送给访客。</strong></p><ol><li>手机安装并打开 Google Authenticator（Google 身份验证器）。</li><li>点击「＋」→「扫描二维码」，扫描下方图片。</li><li>确认新增项目为「V Zhang / Resume」，生成 6 位动态验证码。</li><li>回到网站，输入当前动态码，验证下载是否成功。</li></ol><img src="authenticator-qr.png" alt="私有绑定二维码；如果图片未生成，请使用下方设置密钥"><p>不能扫码时，选择「输入设置密钥」：</p><p>账号名称：V Zhang / Resume<br>密钥：<code>${secret}</code><br>类型：基于时间</p><p>访客只能拿到你私下提供的当前验证码，不能拿到这个密钥。验证码每 30 秒更新，一次成功下载后拒绝重复使用。首次添加后请用手机实际测试，不要只依赖自动检查。</p><p>Google 账号登录和云同步并非本站下载校验所必需；选择适合自己的备份方式。遗失手机时，需要在服务器安全重新配置密钥并重新绑定。</p></body></html>`;
await writeFile(resolve(privateRoot, "authenticator-setup.html"), html, { mode: 0o600 });
console.log(`Private setup page: ${resolve(privateRoot, "authenticator-setup.html")}`);
console.log("Secret and provisioning URI stay outside the website; they are never printed or uploaded.");
