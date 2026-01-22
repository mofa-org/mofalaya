const editor = document.getElementById("md-editor");
const preview = document.getElementById("md-preview");
const titleEl = document.getElementById("editor-title");
const pathEl = document.getElementById("editor-path");
const links = Array.from(document.querySelectorAll(".skill-link"));

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInline(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return output;
}

function renderMarkdown(markdown) {
  const lines = markdown.split("\n");
  let html = "";
  let inList = false;
  let inCode = false;
  let codeBuffer = [];

  lines.forEach((line) => {
    if (line.startsWith("```")) {
      if (inCode) {
        html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (/^\s*-\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${formatInline(line.replace(/^\s*-\s+/, ""))}</li>`;
      return;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (/^#\s+/.test(line)) {
      html += `<h1>${formatInline(line.replace(/^#\s+/, ""))}</h1>`;
      return;
    }

    if (/^##\s+/.test(line)) {
      html += `<h2>${formatInline(line.replace(/^##\s+/, ""))}</h2>`;
      return;
    }

    if (/^###\s+/.test(line)) {
      html += `<h3>${formatInline(line.replace(/^###\s+/, ""))}</h3>`;
      return;
    }

    if (/^>\s+/.test(line)) {
      html += `<blockquote>${formatInline(line.replace(/^>\s+/, ""))}</blockquote>`;
      return;
    }

    if (!line.trim()) {
      html += "<br />";
      return;
    }

    html += `<p>${formatInline(line)}</p>`;
  });

  if (inList) {
    html += "</ul>";
  }

  if (inCode) {
    html += `<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`;
  }

  return html;
}

function updatePreview() {
  preview.innerHTML = renderMarkdown(editor.value);
}

async function loadMarkdown(link) {
  const path = link.dataset.mdPath;
  const title = link.dataset.title || link.textContent.trim();

  links.forEach((item) => item.classList.remove("active"));
  link.classList.add("active");

  titleEl.textContent = title;
  pathEl.textContent = path;

  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("Unable to load file");
    }
    const text = await response.text();
    editor.value = text;
    updatePreview();
  } catch (error) {
    editor.value = `Unable to load ${path}. Start a local server to allow fetch from the filesystem.`;
    updatePreview();
  }
}

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    loadMarkdown(link);
  });
});

editor.addEventListener("input", updatePreview);

if (links.length) {
  loadMarkdown(links[0]);
}
