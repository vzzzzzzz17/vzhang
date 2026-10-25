# V Zhang · Personal website

白底单栏，中英双语，参照原 PDF 的字体层级、细分隔线、三列经历和红色成果强调。公开称呼为 **V Zhang**；私人字段以低调的灰色提示占位，不再满页使用星号，也不删除原来的条目。真实姓名、学校名称、任职公司、手机号和邮箱不写进公开源码。完整 PDF 由后端验证 Google Authenticator 动态码后返回，PDF 本身不加密。

## 网页和下载版：同一个模板

`index.html` 是正文唯一来源，`styles.css` 是网页和 PDF 共用的样式。公开页面的 `data-private` 字段只含占位提示；真实值放在网站目录外的 `../.vzhang-private/resume-details.json`。生成器只在本机将真实值填回同一字段，不更换正文、章节或项目顺序。

```sh
node tools/build-resume.mjs
```

用本机无界面 Chrome 生成中英文完整 PDF，分别为私有目录中的 `resume-current-zh.pdf` 和 `resume-current-en.pdf`。浏览器路径可通过 `CHROME_BIN` 指定。中文、英文下载匹配网页当前语言。旧 PDF 只作内容参考，不再作为下载文件。

修改网页、样式、翻译或私有资料后，重新执行此命令并重启服务。生成清单包含模板指纹和 PDF 校验值；服务启动和下载时检查模板是否更新，不会悄悄提供旧版简历。私人 HTML、PDF、清单和 Chrome 配置均位于私有目录，不能上传公开仓库。

## 绑定 Google Authenticator

需要 Node.js 22+，无需安装运行依赖：

```sh
node tools/setup-authenticator.mjs
```

这个本机工具在网站目录**外**的 `../.vzhang-private/` 生成：

- `authenticator-secret.txt`：随机验证器密钥，文件权限 `600`。
- `authenticator-uri.txt`：用于生成绑定二维码的本地 URI。
- `authenticator-setup.html`：仅本人查看的绑定指南及手动设置密钥。

目录权限为 `700`。首次执行生成新密钥，再次执行复用原密钥，不会偷偷更换绑定。绑定页面引用同一私有目录里的 `authenticator-qr.png`；本次已在本机使用系统工具生成此图片，没有调用在线二维码服务。以后重新绑定若没有二维码，可直接使用 HTML 中的手动设置密钥。

**绑定页面、二维码、密钥都不能上传、截图分享或发给访客。** 手机打开 Google Authenticator，点击「＋」→「扫描二维码」，或者选择「输入设置密钥」，账号名 `V Zhang / Resume`，类型「基于时间」。绑定后务必用手机实际产生的验证码测试一次下载。

无需向 Google 注册本站，不使用 Firebase 短信验证，也无需短信费用。验证器是否登录 Google 账号或启用同步由本人决定，本站后端不依赖 Google 账号。

## 运行

```sh
node server.mjs
```

预览地址：`http://127.0.0.1:8081`。上线必须使用 HTTPS 和支持 Node.js 的服务；GitHub Pages 单独不能运行这个验证码校验 API。不要用普通静态服务器托管完整项目目录。

## Render 部署

仓库可使用 `render.yaml` 创建免费 Web Service。Render 连接仓库后会执行 `npm install --ignore-scripts` 和 `npm start`，并监听 `0.0.0.0:10000`。

Render Dashboard 中需要配置：

1. 连接包含本目录代码的私有 GitHub 仓库，不要使用公开仓库保存完整 PDF。
2. 在服务的 **Secret Files** 中上传 `authenticator-secret.txt`、`resume-current-zh.pdf`、`resume-current-en.pdf`、`resume-details.json`、`resume-manifest.json`，路径对应 `/etc/secrets/`。
3. 设置 `SITE_ORIGIN` 为 Render 部署后的完整 HTTPS 地址，例如 `https://v-zhang-resume.onrender.com`。
4. 将 `RESUME_STATE_DIR` 配置到持久化路径；Render 免费服务重启后可能丢失已使用验证码状态。真正需要一次性码防重放时，应使用持久化存储或共享数据库，并保持单实例。
5. 首次部署后，用 Google Authenticator 当前验证码实际下载一次 PDF。免费实例可能休眠，首次访问会有冷启动延迟。

Render 的免费额度、Secret Files 限制和休眠策略可能变化，部署前以控制台当前说明为准。私有密钥、真实资料和 PDF 不得提交公开仓库。

## 下载流程

页面提示「查看完整信息，下载简历」，访客向本人索取当前验证码，填写 6 位数字；后端验证成功后，返回原 PDF 下载。

- 使用标准 TOTP（HMAC-SHA1、6 位数字、30 秒周期），与 Google Authenticator 兼容。前后各容忍一个时间窗口，确保手机与服务器时钟同步。
- `POST /api/resume` 仅接受验证码，不接受旧固定密码；旧密码不再具备解锁功能。
- 错误、过期和已使用的验证码均返回 `401`，不返回 PDF。一次验证码只能成功使用一次。
- 已使用时间窗口的最高值写入私有 `authenticator-state.json`，重启后仍拒绝重放。验证和写入串行化，防止同时提交同一个码多次成功。
- 若下载中断，验证码也可能已消耗，需要索取新码。
- 每个直连客户端连续失败 5 次限流 15 分钟。限流为内存单进程设计，不信任任意转发 IP 头。
- 浏览器只提交动态码，不会收到验证器密钥。代码不写入 URL、日志或 localStorage，下载响应 `no-store`。
- 只允许明确列出的网页资源，不提供 PDF、后台源码、密钥、绑定二维码或目录列表的公开地址。直接访问 PDF 路径或 GET 下载接口均不允许。

验证码**不绑定某个访客或申请**，谁先成功提交就消耗该码；它不是短信审批或访客身份认证。动态码和 PDF 均只能私下提供给需要的人，无法撤回已经下载的 PDF。

## 私有配置

- `resume-details.json`：真实姓名、公司、学校、联系方式和内部项目名；填入与网页共用的模板。
- `resume-current-zh.pdf`、`resume-current-en.pdf`：由网页模板生成的最新完整简历，不是旧版 PDF。
- `resume-manifest.json`：模板指纹及两份 PDF 的校验值。
- `authenticator-secret.txt`：绑定密钥。
- `authenticator-state.json`：已使用时间窗口，不能删除以绕过重放保护。
- 旧 `resume-password.txt` 留在私有本机目录作历史配置，服务器已不再读取它。

可配置环境变量：`RESUME_TOTP_SECRET_FILE`、`RESUME_PRIVATE_DIR`、`RESUME_STATE_DIR`、`PORT`（默认 `8081`）、`HOST`（默认 `127.0.0.1`）、`SITE_ORIGIN`（线上精确 HTTPS 源）。密钥、PDF 和状态必须在网站目录外，并保证启动时可读取，状态目录可写。

手机遗失时，在安全环境备份旧配置后创建新密钥，并重置与旧密钥关联的状态，再重新绑定。不要在仍使用原密钥时清掉状态。更换密钥不能撤回已下载的 PDF。

生产部署需配置 HTTPS、持久私有状态、服务器时钟同步。仅支持一个进程/实例；多个实例须使用共享存储的原子校验与消费，以及可信代理下的共享限流，不能直接复制当前内存逻辑横向扩容。使用验证器免去了短信费用，不代表后端托管一定免费。

## 隐私与版式

私人字段保留位置，以克制的灰色文字提示未公开。下载版填入完整信息，正文与网页同源。手机屏幕和 A4 分页尺寸不同，会自然换行；并不声称手机网页和打印页逐像素一致。原 PDF 不被修改；新版下载由网页模板生成，包含最新工作和项目经历。

原 GitHub 简历等其他公开渠道不会自动被清理。正文技术细节也可能被关联识别，遮盖明确身份标识并不保证完全匿名。上游开源工具名保留，内部项目名遮盖。

禁止提交 PDF、私有密钥、验证码、绑定页面、二维码或旧私人截图。`.gitignore` 不能清理已有公开 Git 历史。项目未推送、未上线。

参考：
- https://support.google.com/accounts/answer/1066447
- https://www.rfc-editor.org/rfc/rfc6238.html
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
