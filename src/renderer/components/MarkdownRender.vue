<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string;
}>();

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInline(value: string): string {
  let escaped = escapeHtml(value);
  escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return escaped;
}

function isTableSeparator(line: string): boolean {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim());
}

function splitTableRow(line: string): string[] {
  const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return normalized.split("|").map((cell) => renderInline(cell.trim()));
}

function renderMarkdown(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeMatch = line.match(/^```(\w+)?\s*$/);
    if (codeMatch) {
      index += 1;
      const block: string[] = [];
      while (index < lines.length && !/^```/.test(lines[index] ?? "")) {
        block.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      const language = codeMatch[1] ? ` data-language="${escapeHtml(codeMatch[1])}"` : "";
      html.push(`<pre class="markdown-code-block"${language}><code>${escapeHtml(block.join("\n"))}</code></pre>`);
      continue;
    }

    if (
      trimmed.includes("|")
      && index + 1 < lines.length
      && isTableSeparator(lines[index + 1] ?? "")
    ) {
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && (lines[index] ?? "").trim().includes("|")) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }
      html.push(
        `<table class="markdown-table"><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${
          rows.map((cells) => `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")
        }</tbody></table>`,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const block: string[] = [];
      while (index < lines.length && /^>\s?/.test((lines[index] ?? "").trim())) {
        block.push(renderInline((lines[index] ?? "").trim().replace(/^>\s?/, "")));
        index += 1;
      }
      html.push(`<blockquote>${block.join("<br />")}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test((lines[index] ?? "").trim())) {
        items.push(`<li>${renderInline((lines[index] ?? "").trim().replace(/^[-*]\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? "").trim())) {
        items.push(`<li>${renderInline((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    const paragraph: string[] = [renderInline(trimmed)];
    index += 1;
    while (index < lines.length) {
      const candidate = (lines[index] ?? "").trim();
      if (
        !candidate
        || /^#{1,4}\s+/.test(candidate)
        || /^```/.test(candidate)
        || /^[-*]\s+/.test(candidate)
        || /^\d+\.\s+/.test(candidate)
        || /^>\s?/.test(candidate)
        || /^---+$/.test(candidate)
        || (candidate.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1] ?? ""))
      ) {
        break;
      }
      paragraph.push(renderInline(candidate));
      index += 1;
    }
    html.push(`<p>${paragraph.join("<br />")}</p>`);
  }

  return html.join("");
}

const renderedHtml = computed(() => renderMarkdown(props.content ?? ""));
</script>

<template>
  <div class="markdown-render" v-html="renderedHtml"></div>
</template>
