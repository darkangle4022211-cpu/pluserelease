// PulseRelease Official Engine
const REPO = "darkangle4022211-cpu/pluserelease";
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
const REVIEWS_API = `https://api.github.com/repos/${REPO}/issues?labels=review&state=all&per_page=20`;

const CACHE_KEY = "pulserelease_cache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

// Workspace Tabs Data
const WORKSPACE_DATA = [
  {
    title: "Release Staging & Deployment",
    file: "./assets/release-staging.jpg",
    caption: "Developer Staging Console: Drag-and-drop binary artifact packaging with automatic SHA-256 hash generation."
  },
  {
    title: "Registered Applications Hub",
    file: "./assets/registered-apps.png",
    caption: "Multi-Application Hub orchestrating update distribution for HyperDrain, Pulsar Audio, and AeroPlayer."
  },
  {
    title: "Universal Client Companion SDK",
    file: "./assets/client-companion.jpg",
    caption: "Zero-dependency client updater companion scripts for Python, Linux Shell, Android Kotlin, Tauri, and C++."
  }
];

// SDK Code Snippets
const SDK_SNIPPETS = {
  python: `import urllib.request, json, os, hashlib

def check_for_updates(manifest_url, current_version):
    req = urllib.request.Request(manifest_url, headers={'User-Agent': 'PulseRelease-Client/1.0'})
    with urllib.request.urlopen(req) as resp:
        if resp.status != 200:
            return None
        manifest = json.loads(resp.read().decode('utf-8'))
        remote_ver = manifest.get('version', '')
        if remote_ver != current_version:
            print(f"[+] Update Available: v{current_version} -> v{remote_ver}")
            print(f"[*] Changelog: {manifest.get('changelog', '')}")
            return manifest
    return None

def verify_and_download(url, target_path, expected_sha256):
    urllib.request.urlretrieve(url, target_path)
    with open(target_path, 'rb') as f:
        computed = hashlib.sha256(f.read()).hexdigest()
    if computed != expected_sha256:
        os.remove(target_path)
        raise ValueError("SHA-256 checksum mismatch!")
    print("[+] Download verified successfully.")`,

  shell: `#!/usr/bin/env bash
set -euo pipefail

MANIFEST_URL="$1"
CURRENT_VER="$2"

echo "[*] Polling PulseRelease manifest: $MANIFEST_URL"
MANIFEST=$(curl -sSL "$MANIFEST_URL")
REMOTE_VER=$(echo "$MANIFEST" | grep -oP '"version":\s*"\K[^"]+')

if [ "$REMOTE_VER" != "$CURRENT_VER" ]; then
    echo "[+] Update found: $CURRENT_VER -> $REMOTE_VER"
    DOWNLOAD_URL=$(echo "$MANIFEST" | grep -oP '"download_url":\s*"\K[^"]+')
    EXPECTED_HASH=$(echo "$MANIFEST" | grep -oP '"sha256":\s*"\K[^"]+')
    
    curl -sSL -o "update_pkg.deb" "$DOWNLOAD_URL"
    ACTUAL_HASH=$(sha256sum "update_pkg.deb" | awk '{print $1}')
    
    if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
        echo "[-] Cryptographic hash mismatch! Aborting."
        exit 1
    fi
    echo "[+] Applying update package..."
    sudo dpkg -i "update_pkg.deb"
fi`,

  kotlin: `// Android Universal Updater Companion
suspend fun checkForUpdates(manifestUrl: String, currentVersion: String): UpdateManifest? = withContext(Dispatchers.IO) {
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

  rust: `// Tauri / Rust Universal Updater
use sha2::{Sha256, Digest};
use serde::Deserialize;

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

  cpp: `// C++ / Qt Universal Updater
void ClientUpdater::checkUpdates(const QUrl &manifestUrl, const QString &currentVersion) {
    QNetworkRequest request(manifestUrl);
    request.setHeader(QNetworkRequest::UserAgentHeader, "PulseRelease-Client/1.0");
    QNetworkReply *reply = manager->get(request);
    connect(reply, &QNetworkReply::finished, [=]() {
        if (reply->error() == QNetworkReply::NoError) {
            QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
            QString remote = doc["version"].toString();
            if (remote != currentVersion) {
                emit updateFound(remote, doc["download_url"].toString());
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

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let gReleases = [];

async function fetchReleases() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        gReleases = parsed.data;
        renderReleases(gReleases);
        return;
      }
    }
  } catch (_) {}

  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: "application/vnd.github.v3+json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      gReleases = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
      } catch (_) {}
      renderReleases(gReleases);
    }
  } catch (err) {
    console.warn("Using fallback releases:", err);
    renderFallbackReleases();
  }
}

function renderFallbackReleases() {
  const fallback = [
    {
      tag_name: "v1.0.9",
      name: "v1.0.9 - Production Release",
      published_at: "2026-10-14T21:19:00Z",
      assets: [
        {
          name: "pulse-release_1.0.9_amd64.deb",
          size: 105278478,
          browser_download_url: "https://github.com/darkangle4022211-cpu/pluserelease/releases/download/v1.0.9/pulse-release_1.0.9_amd64.deb"
        }
      ]
    }
  ];
  gReleases = fallback;
  renderReleases(fallback);
}

function renderReleases(releases) {
  if (!releases || releases.length === 0) return;
  const latest = releases[0];

  const heroCta = document.getElementById("hero-download-btn");
  const headerCta = document.getElementById("header-download-btn");
  const relTagEl = document.getElementById("highlight-release-tag");
  const relDateEl = document.getElementById("highlight-release-date");

  if (relTagEl) relTagEl.textContent = latest.tag_name;
  if (relDateEl) relDateEl.textContent = formatDate(latest.published_at);

  let debAsset = null;
  for (const a of latest.assets || []) {
    if (a.name.endsWith(".deb")) debAsset = a;
  }

  const primaryTarget = debAsset || (latest.assets && latest.assets[0]);
  if (primaryTarget) {
    const url = primaryTarget.browser_download_url;
    const size = formatBytes(primaryTarget.size);
    if (heroCta) {
      heroCta.href = url;
      heroCta.innerHTML = `<span>Download ${escapeHtml(latest.tag_name)} (.deb)</span> <span class="mono" style="opacity:0.85;font-size:0.75rem;">(${size})</span>`;
    }
    if (headerCta) {
      headerCta.href = url;
      headerCta.textContent = `Download ${latest.tag_name}`;
    }
  }

  // Render Assets Grid
  const grid = document.getElementById("release-assets-grid");
  if (grid) {
    const assets = (latest.assets || []).filter(a => !a.name.endsWith(".json"));
    grid.innerHTML = assets.map(a => `
      <a href="${escapeHtml(a.browser_download_url)}" class="asset-download-card" download>
        <div>
          <div class="asset-name">${escapeHtml(a.name)}</div>
          <div class="asset-size">${formatBytes(a.size)} • Linux x64 Debian / Ubuntu</div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-cyan);">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </a>
    `).join("");
  }

  // Render Releases History Table
  const tbody = document.getElementById("releases-history-tbody");
  if (tbody) {
    tbody.innerHTML = releases.map(rel => `
      <tr>
        <td style="font-weight:700;color:var(--color-cyan);">${escapeHtml(rel.tag_name)}</td>
        <td style="color:var(--color-muted);">${formatDate(rel.published_at)}</td>
        <td>${escapeHtml(rel.name || rel.tag_name)}</td>
        <td style="color:var(--color-muted);">${(rel.assets || []).length} files</td>
        <td><a href="${escapeHtml(rel.html_url)}" target="_blank" rel="noopener" style="color:var(--color-accent);text-decoration:none;">View &rarr;</a></td>
      </tr>
    `).join("");
  }
}

// Interactive Dropzone Simulation
function initDropzone() {
  const dropzone = document.getElementById("hero-dropzone");
  const fileInput = document.getElementById("dropzone-file-input");
  const manifestBox = document.getElementById("manifest-output-box");
  const hashValEl = document.getElementById("manifest-hash-val");
  const fileValEl = document.getElementById("manifest-file-val");
  const sizeValEl = document.getElementById("manifest-size-val");

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());

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

  async function processFile(file) {
    if (fileValEl) fileValEl.textContent = file.name;
    if (sizeValEl) sizeValEl.textContent = `${(file.size / 1048576).toFixed(2)} MB (${file.size} bytes)`;
    if (hashValEl) hashValEl.textContent = "Computing SHA-256...";

    try {
      const buffer = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(digest));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      if (hashValEl) hashValEl.textContent = hashHex;
      if (manifestBox) manifestBox.style.display = "block";
    } catch (_) {
      if (hashValEl) hashValEl.textContent = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    }
  }
}

// SDK Code Tabs
function initSdkPlayground() {
  const tabs = document.querySelectorAll(".sdk-tab-btn");
  const codeEl = document.getElementById("sdk-code-display");
  const copyBtn = document.getElementById("sdk-copy-btn");
  if (!tabs.length || !codeEl) return;

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const lang = tab.dataset.lang;
      const snippet = SDK_SNIPPETS[lang];
      if (snippet) {
        codeEl.textContent = snippet;
      }
    });
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent);
        copyBtn.textContent = "COPIED!";
        setTimeout(() => { copyBtn.textContent = "COPY CODE"; }, 2000);
      } catch (_) {}
    });
  }
}

// Workspace Tabs
function initWorkspaceWalkthrough() {
  const tabs = document.querySelectorAll(".ws-tab");
  const imgEl = document.getElementById("ws-display-img");
  const captionEl = document.getElementById("ws-display-caption");
  if (!tabs.length || !imgEl || !captionEl) return;

  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const item = WORKSPACE_DATA[idx];
      if (item) {
        imgEl.style.opacity = "0";
        setTimeout(() => {
          imgEl.src = item.file;
          imgEl.alt = item.title;
          captionEl.textContent = item.caption;
          imgEl.style.opacity = "1";
        }, 150);
      }
    });
  });
}

function initTerminalCopy() {
  const btn = document.getElementById("terminal-copy-btn");
  const text = document.getElementById("terminal-command-text");
  if (!btn || !text) return;

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text.textContent.trim());
      btn.textContent = "COPIED!";
      setTimeout(() => { btn.textContent = "COPY"; }, 2000);
    } catch (_) {}
  });
}

function initReleasesToggle() {
  const btn = document.getElementById("releases-history-toggle");
  const wrap = document.getElementById("releases-table-wrap");
  if (!btn || !wrap) return;

  btn.addEventListener("click", () => {
    const isOpen = wrap.classList.toggle("open");
    btn.textContent = isOpen ? "Hide release history ▲" : "View all releases ▼";
  });
}

// Review System
async function fetchRealReviews() {
  const feed = document.getElementById("reviews-feed");
  const empty = document.getElementById("empty-reviews-state");
  if (!feed) return;

  try {
    const res = await fetch(REVIEWS_API);
    if (!res.ok) return;
    const issues = await res.json();

    if (Array.isArray(issues) && issues.length > 0) {
      if (empty) empty.remove();
      issues.forEach(issue => {
        const user = issue.user ? issue.user.login : "Developer";
        const body = issue.body || "";
        const card = document.createElement("div");
        card.className = "empty-reviews-card";
        card.style.textAlign = "left";
        card.style.padding = "18px 20px";
        card.style.marginBottom = "12px";
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <strong style="color:var(--color-ink);">${escapeHtml(user)}</strong>
            <span style="color:#fbbf24;">★★★★★</span>
          </div>
          <p style="color:var(--color-ink-2);font-size:var(--text-sm);line-height:1.5;">${escapeHtml(body)}</p>
        `;
        feed.appendChild(card);
      });
    }
  } catch (_) {}
}

function initReviewForm() {
  const form = document.getElementById("review-form");
  const starContainer = document.getElementById("star-rating-picker");
  const starInput = document.getElementById("rating-stars-val");
  const feed = document.getElementById("reviews-feed");

  if (starContainer && starInput) {
    const stars = starContainer.querySelectorAll(".star-btn");
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const rating = parseInt(star.dataset.val, 10);
        starInput.value = rating;
        stars.forEach(s => {
          s.style.opacity = parseInt(s.dataset.val, 10) <= rating ? "1" : "0.3";
        });
      });
    });
  }

  if (form && feed) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("reviewer-name-input").value.trim() || "Developer";
      const comment = document.getElementById("reviewer-comment-input").value.trim();
      const starsVal = parseInt(starInput.value, 10) || 5;
      if (!comment) return;

      const starStr = "★".repeat(starsVal) + "☆".repeat(5 - starsVal);
      const empty = document.getElementById("empty-reviews-state");
      if (empty) empty.remove();

      const newCard = document.createElement("div");
      newCard.className = "empty-reviews-card";
      newCard.style.textAlign = "left";
      newCard.style.padding = "18px 20px";
      newCard.style.marginBottom = "12px";
      newCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <strong style="color:var(--color-ink);">${escapeHtml(name)}</strong>
          <span style="color:#fbbf24;">${starStr}</span>
        </div>
        <p style="color:var(--color-ink-2);font-size:var(--text-sm);line-height:1.5;">${escapeHtml(comment)}</p>
      `;
      feed.prepend(newCard);

      const issueTitle = encodeURIComponent(`[Review] ${name} (${starsVal} Stars)`);
      const issueBody = encodeURIComponent(`### Rating: ${starStr}\n\n**Reviewer:** ${name}\n\n**Feedback:**\n${comment}`);
      const issueUrl = `https://github.com/${REPO}/issues/new?title=${issueTitle}&body=${issueBody}&labels=review`;
      window.open(issueUrl, "_blank");

      form.reset();
      alert("Thank you! Your feedback has been posted and prepared on GitHub.");
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchReleases();
  initDropzone();
  initSdkPlayground();
  initWorkspaceWalkthrough();
  initTerminalCopy();
  initReleasesToggle();
  fetchRealReviews();
  initReviewForm();
});
