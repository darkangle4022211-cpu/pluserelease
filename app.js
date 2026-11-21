const REPO = "darkangle4022211-cpu/pluserelease";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
const REVIEWS_API = `https://api.github.com/repos/${REPO}/issues?labels=review&state=all&per_page=20`;
const CACHE_KEY = "pulserelease_cache_v3";
const CACHE_TTL_MS = 5 * 60 * 1000;

const HERO_SCREENS = [
  {
    src: "./assets/release-staging.webp",
    alt: "PulseRelease Staging and Deployment desktop console with binary dropzone and manifest output",
    caption: "Drag-and-drop binary staging synced on 2026-10-14 21:19 UTC."
  },
  {
    src: "./assets/registered-apps.webp",
    alt: "PulseRelease Registered Applications hub tracking pluserelease, pulser audio, aeroplayer, and hyperdrain",
    caption: "Manage connected desktop builds from a single application hub."
  },
  {
    src: "./assets/client-companion.webp",
    alt: "PulseRelease Universal Client Companion SDK view with integrated updater scripts",
    caption: "Copy embedded updater scripts directly into client builds."
  }
];

const WORKSPACE_DATA = [
  {
    src: "./assets/registered-apps.webp",
    alt: "PulseRelease Registered Applications dashboard showing pluserelease, pulser audio, aeroplayer, and hyperdrain",
    caption: "Multi-application hub tracking versions for PulseRelease, Pulsar Audio, AeroPlayer, and HyperDrain."
  },
  {
    src: "./assets/release-staging.webp",
    alt: "PulseRelease Staging and Deployment view computing cryptographic SHA-256 digests",
    caption: "Developer Staging Console packaging release binaries and static update.json manifests."
  },
  {
    src: "./assets/client-companion.webp",
    alt: "PulseRelease Client Companion SDK view with multi-language code previews",
    caption: "Zero-dependency client updater templates for Python, POSIX shell, Kotlin, Tauri, and C++."
  }
];

const SAMPLE_TARGETS = {
  ".deb": { name: "pulse-release_1.0.9_amd64.deb", bytes: 105278478, version: "1.0.9" },
  ".AppImage": { name: "HyperDrain-1.1.0.AppImage", bytes: 152987238, version: "1.1.0" },
  ".exe": { name: "Pulsar-Music-Player-Setup-1.1.10.exe", bytes: 170605709, version: "1.1.10" },
  ".apk": { name: "companion-mobile-1.0.4.apk", bytes: 28416000, version: "1.0.4" }
};

const SDK_SNIPPETS = {
  python: `import urllib.request, json, os, hashlib

def check_for_updates(manifest_url, current_version):
    req = urllib.request.Request(manifest_url, headers={"User-Agent": "PulseRelease-Client/1.0"})
    with urllib.request.urlopen(req) as resp:
        if resp.status != 200:
            return None
        manifest = json.loads(resp.read().decode("utf-8"))
        remote_ver = manifest.get("version", "")
        if remote_ver and remote_ver != current_version:
            return manifest
    return None

def verify_and_download(url, target_path, expected_sha256):
    urllib.request.urlretrieve(url, target_path)
    with open(target_path, "rb") as f:
        computed = hashlib.sha256(f.read()).hexdigest()
    if computed != expected_sha256:
        os.remove(target_path)
        raise ValueError("SHA-256 checksum mismatch")
    return target_path`,

  shell: `#!/usr/bin/env bash
set -euo pipefail

MANIFEST_URL="$1"
CURRENT_VER="$2"

MANIFEST=$(curl -fsSL "$MANIFEST_URL")
REMOTE_VER=$(echo "$MANIFEST" | grep -oP '"version":\\s*"\\K[^"]+')

if [ "$REMOTE_VER" != "$CURRENT_VER" ]; then
    DOWNLOAD_URL=$(echo "$MANIFEST" | grep -oP '"download_url":\\s*"\\K[^"]+')
    EXPECTED_HASH=$(echo "$MANIFEST" | grep -oP '"sha256":\\s*"\\K[^"]+')
    curl -fsSL -o "update_pkg.deb" "$DOWNLOAD_URL"
    ACTUAL_HASH=$(sha256sum "update_pkg.deb" | awk '{print $1}')
    if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
        rm -f "update_pkg.deb"
        exit 1
    fi
    sudo dpkg -i "update_pkg.deb"
fi`,

  kotlin: `suspend fun checkForUpdates(manifestUrl: String, currentVersion: String): UpdateManifest? =
    withContext(Dispatchers.IO) {
        val client = OkHttpClient()
        val request = Request.Builder().url(manifestUrl).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext null
            val json = JSONObject(response.body?.string() ?: "")
            val remoteVersion = json.getString("version")
            if (remoteVersion != currentVersion) {
                return@withContext UpdateManifest(
                    version = remoteVersion,
                    downloadUrl = json.getString("download_url"),
                    sha256 = json.getString("sha256")
                )
            }
        }
        null
    }`,

  rust: `use serde::Deserialize;

#[derive(Deserialize)]
pub struct Manifest {
    pub version: String,
    pub download_url: String,
    pub sha256: String,
}

pub async fn check_update(url: &str, current: &str) -> Result<Option<Manifest>, Box<dyn std::error::Error>> {
    let manifest: Manifest = reqwest::get(url).await?.json().await?;
    if manifest.version != current {
        Ok(Some(manifest))
    } else {
        Ok(None)
    }
}`,

  cpp: `void ClientUpdater::checkUpdates(const QUrl &manifestUrl, const QString &currentVersion) {
    QNetworkRequest request(manifestUrl);
    request.setHeader(QNetworkRequest::UserAgentHeader, "PulseRelease-Client/1.0");
    QNetworkReply *reply = manager->get(request);
    connect(reply, &QNetworkReply::finished, [this, reply, currentVersion]() {
        if (reply->error() == QNetworkReply::NoError) {
            QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
            QString remote = doc["version"].toString();
            if (remote != currentVersion) {
                emit updateFound(remote, doc["download_url"].toString(), doc["sha256"].toString());
            }
        }
        reply->deleteLater();
    });
}`
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatUtc(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "2026-10-14 21:19 UTC";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderReleases(releases) {
  if (!Array.isArray(releases) || releases.length === 0) return;
  const latest = releases[0];
  const tag = latest.tag_name || "v1.0.9";
  const utcTime = formatUtc(latest.published_at);

  const headerBtn = document.getElementById("header-download-btn");
  const heroBtn = document.getElementById("hero-download-btn");
  const heroMeta = document.getElementById("hero-package-meta");
  const relTagEl = document.getElementById("highlight-release-tag");
  const relDateEl = document.getElementById("highlight-release-date");
  const cmdEl = document.getElementById("terminal-command-text");

  if (headerBtn) headerBtn.textContent = `Get ${tag}`;
  if (relTagEl) relTagEl.textContent = tag;
  if (relDateEl) relDateEl.textContent = utcTime;

  const debAsset = (latest.assets || []).find((a) => a.name.endsWith(".deb")) || (latest.assets && latest.assets[0]);
  if (debAsset) {
    const sizeText = formatBytes(debAsset.size);
    if (heroBtn) {
      heroBtn.href = debAsset.browser_download_url;
      heroBtn.setAttribute("download", debAsset.name);
      heroBtn.textContent = "Download .deb";
    }
    if (heroMeta) {
      heroMeta.textContent = `${debAsset.name} (${sizeText})`;
    }
    if (cmdEl) {
      cmdEl.textContent = `sudo dpkg -i ${debAsset.name}`;
    }
  }

  const assetsGrid = document.getElementById("release-assets-grid");
  if (assetsGrid) {
    const installables = (latest.assets || []).filter((a) => !a.name.endsWith(".json"));
    if (installables.length) {
      assetsGrid.innerHTML = installables
        .map(
          (a) => `
          <a class="asset-row" href="${escapeHtml(a.browser_download_url)}" download="${escapeHtml(a.name)}">
            <span class="measure">${escapeHtml(a.name)}</span>
            <span class="measure muted">${escapeHtml(formatBytes(a.size))}</span>
            <span class="asset-action">Download</span>
          </a>`
        )
        .join("");
    }
  }

  const tbody = document.getElementById("releases-history-tbody");
  if (tbody) {
    tbody.innerHTML = releases
      .map(
        (rel) => `
        <tr>
          <td class="measure">${escapeHtml(rel.tag_name)}</td>
          <td class="measure muted">${escapeHtml(formatUtc(rel.published_at))}</td>
          <td>${escapeHtml(rel.name || rel.tag_name)}</td>
          <td class="measure muted">${(rel.assets || []).length} files</td>
          <td><a href="${escapeHtml(rel.html_url)}" target="_blank" rel="noopener noreferrer">Release</a></td>
        </tr>`
      )
      .join("");
  }
}

async function fetchReleases() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        renderReleases(parsed.data);
        return;
      }
    }
  } catch {
    // Ignore storage error
  }

  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch {
        // Ignore storage error
      }
      renderReleases(data);
    }
  } catch {
    // Fallback static values stay visible
  }
}

function initHeroStage() {
  const imgs = Array.from(document.querySelectorAll("#intro-stage-frame .stage-img"));
  const caption = document.getElementById("hero-stage-caption");
  const btns = Array.from(document.querySelectorAll("[data-hero-screen]"));
  if (!imgs.length || !caption || !btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-hero-screen"));
      const item = HERO_SCREENS[idx];
      if (!item) return;
      btns.forEach((b, i) => {
        const active = i === idx;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      imgs.forEach((img, i) => {
        img.classList.toggle("is-visible", i === idx);
      });
      caption.textContent = item.caption;
    });
  });
}

async function computeSha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function updateManifestUI(name, bytes, version, hashHex, utcStamp) {
  const fileEl = document.getElementById("manifest-file-val");
  const sizeEl = document.getElementById("manifest-size-val");
  const hashEl = document.getElementById("manifest-hash-val");
  const timeEl = document.getElementById("manifest-time-val");
  const previewEl = document.getElementById("manifest-json-preview");

  if (fileEl) fileEl.textContent = name;
  if (sizeEl) sizeEl.textContent = `${formatBytes(bytes)} (${bytes.toLocaleString("en-US")} bytes)`;
  if (hashEl) hashEl.textContent = hashHex;
  if (timeEl) timeEl.textContent = utcStamp;
  if (previewEl) {
    previewEl.textContent = JSON.stringify(
      {
        version,
        artifact: name,
        sha256: hashHex,
        published_utc: utcStamp,
        channel: "stable"
      },
      null,
      2
    );
  }
}

function initSandbox() {
  const dropzone = document.getElementById("hero-dropzone");
  const dropBtn = document.getElementById("hero-dropzone-btn");
  const fileInput = document.getElementById("dropzone-file-input");
  const formatBtns = Array.from(document.querySelectorAll(".format-btn"));

  if (dropBtn && fileInput) {
    dropBtn.addEventListener("click", () => fileInput.click());
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        processFile(e.target.files[0]);
      }
    });
  }

  async function processFile(file) {
    formatBtns.forEach((b) => b.classList.remove("is-active"));
    const buf = await file.arrayBuffer();
    const hex = await computeSha256Hex(buf);
    updateManifestUI(file.name, file.size, "local-staged", hex, formatUtc());
  }

  formatBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ext = btn.getAttribute("data-sample-ext");
      const meta = SAMPLE_TARGETS[ext];
      if (!meta) return;
      formatBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      const payload = new TextEncoder().encode(`${meta.name}:${meta.bytes}:pulserelease`);
      const hex = await computeSha256Hex(payload.buffer);
      updateManifestUI(meta.name, meta.bytes, meta.version, hex, formatUtc());
    });
  });
}

function initSdkPlayground() {
  const tabs = Array.from(document.querySelectorAll(".sdk-tab-btn"));
  const codeEl = document.getElementById("sdk-code-display");
  const copyBtn = document.getElementById("sdk-copy-btn");
  const statusEl = document.getElementById("live-status");
  if (!codeEl || !tabs.length) return;

  codeEl.textContent = SDK_SNIPPETS.python;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const lang = tab.getAttribute("data-lang");
      const snippet = SDK_SNIPPETS[lang];
      if (!snippet) return;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      codeEl.textContent = snippet;
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent);
        copyBtn.textContent = "Copied";
        if (statusEl) statusEl.textContent = "SDK snippet copied.";
        window.setTimeout(() => {
          copyBtn.textContent = "Copy snippet";
        }, 1600);
      } catch {
        copyBtn.textContent = "Failed";
      }
    });
  }
}

function initWorkspaceWalkthrough() {
  const tabs = Array.from(document.querySelectorAll(".ws-tab"));
  const stageImgs = Array.from(document.querySelectorAll("#workspace-stage-frame .stage-img"));
  const captionEl = document.getElementById("ws-display-caption");
  if (!tabs.length || !stageImgs.length || !captionEl) return;

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      const item = WORKSPACE_DATA[idx];
      if (!item) return;
      tabs.forEach((t, i) => {
        const active = i === idx;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      stageImgs.forEach((img, i) => {
        img.classList.toggle("is-visible", i === idx);
      });
      captionEl.textContent = item.caption;
    });
  });
}

function initTerminalCopy() {
  const btn = document.getElementById("terminal-copy-btn");
  const text = document.getElementById("terminal-command-text");
  const statusEl = document.getElementById("live-status");
  if (!btn || !text) return;

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text.textContent.trim());
      btn.textContent = "Copied";
      if (statusEl) statusEl.textContent = "Install command copied.";
      window.setTimeout(() => {
        btn.textContent = "Copy command";
      }, 1600);
    } catch {
      btn.textContent = "Failed";
    }
  });
}

function initReleasesToggle() {
  const btn = document.getElementById("releases-history-toggle");
  const wrap = document.getElementById("releases-table-wrap");
  if (!btn || !wrap) return;

  btn.addEventListener("click", () => {
    const willOpen = wrap.hasAttribute("hidden");
    if (willOpen) {
      wrap.removeAttribute("hidden");
      btn.textContent = "Hide release log";
    } else {
      wrap.setAttribute("hidden", "");
      btn.textContent = "Show release log";
    }
  });
}

function cleanFeedbackBody(body) {
  return String(body || "")
    .replace(/^###\s*Rating:.*$/gim, "")
    .replace(/^\*\*Reviewer:\*\*.*$/gim, "")
    .replace(/^\*\*Feedback:\*\*$/gim, "")
    .trim();
}

function parseRatingLabel(title, body) {
  const m = `${title} ${body}`.match(/([1-5])\s*(?:Stars|\/ 5)/i);
  const val = m ? Number(m[1]) : 5;
  return `${val} / 5`;
}

async function fetchRealReviews() {
  const listEl = document.getElementById("reviews-list");
  const statusEl = document.getElementById("reviews-status");
  if (!listEl || !statusEl) return;

  try {
    const res = await fetch(REVIEWS_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) return;
    const issues = await res.json();
    const reviews = Array.isArray(issues) ? issues.filter((i) => !i.pull_request) : [];
    statusEl.textContent = `${reviews.length} published`;

    if (!reviews.length) return;

    listEl.innerHTML = reviews
      .map((issue) => {
        const user = issue.user ? issue.user.login : "developer";
        const bodyText = cleanFeedbackBody(issue.body) || "No comment text provided.";
        return `
          <article class="review-item">
            <div class="review-meta">
              <span>@${escapeHtml(user)}</span>
              <span class="measure">${escapeHtml(parseRatingLabel(issue.title, issue.body))}</span>
            </div>
            <p>${escapeHtml(bodyText)}</p>
          </article>
        `;
      })
      .join("");
  } catch {
    // Keep empty state cleanly
  }
}

function initReviewForm() {
  const form = document.getElementById("review-form");
  const help = document.getElementById("review-form-help");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reviewer-name-input").value.trim();
    const comment = document.getElementById("reviewer-comment-input").value.trim();
    const rating = document.getElementById("rating-stars-val").value;

    if (!name || !comment) {
      if (help) help.textContent = "Enter your GitHub handle and comment first.";
      return;
    }

    const params = new URLSearchParams({
      labels: "review",
      title: `[Feedback] ${name} (${rating} / 5)`,
      body: `**Rating:** ${rating} / 5\n\n**Reviewer:** ${name}\n\n${comment}`
    });

    if (help) help.textContent = "Prepared a pre-filled issue draft in a new GitHub tab.";
    window.open(`https://github.com/${REPO}/issues/new?${params.toString()}`, "_blank", "noopener,noreferrer");
  });
}

function warmStageImages() {
  document.querySelectorAll(".stage-img").forEach((img) => {
    if (img.decode) {
      img.decode().catch(() => {});
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  warmStageImages();
  fetchReleases();
  initHeroStage();
  initSandbox();
  initSdkPlayground();
  initWorkspaceWalkthrough();
  initTerminalCopy();
  initReleasesToggle();
  fetchRealReviews();
  initReviewForm();
});
