import { App, MarkdownPostProcessor, MarkdownPostProcessorContext, Plugin, TFile, Editor } from "obsidian";
import { MDBridgeSettings } from "./types";

const TASK_CHECKED_PATTERN = /^- \[x\] /i;
const TASK_UNCHECKED_PATTERN = /^- \[ \] /;

export class GfmRenderer {
  private app: App;
  private settings: MDBridgeSettings;

  constructor(app: App, settings: MDBridgeSettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: MDBridgeSettings): void {
    this.settings = settings;
  }

  registerPostProcessors(plugin: Plugin): void {
    plugin.registerMarkdownPostProcessor(this.strikethroughProcessor.bind(this));
    plugin.registerMarkdownPostProcessor(this.footnoteProcessor.bind(this));
    plugin.registerMarkdownPostProcessor(this.taskListProcessor.bind(this));
    plugin.registerMarkdownPostProcessor(this.definitionListProcessor.bind(this));

    plugin.registerMarkdownCodeBlockProcessor("deflist", this.definitionListCodeBlockProcessor.bind(this));
  }

  private strikethroughProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableStrikethrough) return;

    el.querySelectorAll("del, s").forEach((node) => {
      const del = node as HTMLElement;
      if (!del.hasClass("mdbridge-strikethrough")) {
        del.addClass("mdbridge-strikethrough");
      }
    });

    this.processRawStrikethrough(el);
  }

  private processRawStrikethrough(el: HTMLElement): void {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.textContent || "";
        return text.includes("~~") && !node.parentElement?.closest("del, s, code, pre")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const textNodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current as Text);
      current = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      if (!text.includes("~~")) continue;

      const parent = textNode.parentElement;
      if (!parent) continue;

      const span = document.createElement("span");
      span.innerHTML = this.convertStrikethrough(text);
      parent.replaceChild(span, textNode);
    }
  }

  convertStrikethrough(text: string): string {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/~~(.+?)~~/g, '<del class="mdbridge-strikethrough">$1</del>');
  }

  private footnoteProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableFootnotes) return;

    const footnoteRefs = el.querySelectorAll('a[href^="#^"], sup.fnref');
    footnoteRefs.forEach((ref) => {
      const link = ref as HTMLAnchorElement;
      link.addClass("mdbridge-footnote-ref");

      if (this.settings.footnotesHoverPreview) {
        this.attachFootnoteHover(link, el);
      }
    });

    const footnoteDefs = el.querySelectorAll('section.footnotes, div.footnotes');
    footnoteDefs.forEach((section) => {
      const defSection = section as HTMLElement;
      defSection.addClass("mdbridge-footnotes");

      const items = defSection.querySelectorAll("li");
      items.forEach((item, index) => {
        const li = item as HTMLElement;
        li.addClass("mdbridge-footnote-item");
        li.setAttribute("data-footnote-index", String(index + 1));
      });
    });
  }

  private attachFootnoteHover(link: HTMLAnchorElement, container: HTMLElement): void {
    const footnoteId = link.getAttribute("href") || "";
    if (!footnoteId.startsWith("#^")) return;

    let tooltip: HTMLElement | null = null;

    const showTooltip = (e: MouseEvent) => {
      const fnContent = this.findFootnoteContent(container, footnoteId);
      if (!fnContent) return;

      tooltip = document.createElement("div");
      tooltip.addClass("mdbridge-footnote-tooltip");
      tooltip.textContent = fnContent;
      document.body.appendChild(tooltip);

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + 6}px`;
    };

    const hideTooltip = () => {
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    };

    link.addEventListener("mouseenter", showTooltip);
    link.addEventListener("mouseleave", hideTooltip);
  }

  private findFootnoteContent(container: HTMLElement, footnoteId: string): string | null {
    const targetId = footnoteId.replace("#^", "").replace("#fn-", "");
    const footnotesSection = container.querySelector("section.footnotes, div.footnotes");
    if (!footnotesSection) return null;

    const items = footnotesSection.querySelectorAll("li");
    for (const item of items) {
      const li = item as HTMLElement;
      const id = li.getAttribute("id") || "";
      if (id.includes(targetId)) {
        return li.textContent?.trim() || null;
      }
    }
    return null;
  }

  private taskListProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableTaskLists) return;

    const checkboxes = el.querySelectorAll(
      'input[type="checkbox"], .task-list-item-checkbox',
    );

    checkboxes.forEach((checkbox) => {
      const input = checkbox as HTMLInputElement;
      input.addClass("mdbridge-task-checkbox");

      const listItem = input.closest("li");
      if (listItem) {
        listItem.addClass("mdbridge-task-item");
        if (input.checked) {
          listItem.addClass("mdbridge-task-done");
        }
      }

      input.addEventListener("change", () => {
        this.handleTaskToggle(input, ctx);
      });
    });

    if (this.settings.taskListShowDates) {
      this.addTaskDates(el, ctx);
    }
  }

  private async handleTaskToggle(
    checkbox: HTMLInputElement,
    ctx: MarkdownPostProcessorContext,
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;

    const listItem = checkbox.closest("li");
    if (!listItem) return;

    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) {
      const content = await this.app.vault.read(file);
      const updated = this.toggleTaskInContent(content, checkbox.checked);
      await this.app.vault.modify(file, updated);
      return;
    }

    const listItems = editor.getAllSelections
      ? []
      : [];
    const lineCount = editor.lineCount();
    for (let i = 0; i < lineCount; i++) {
      const line = editor.getLine(i);
      const isTask = TASK_CHECKED_PATTERN.test(line) || TASK_UNCHECKED_PATTERN.test(line);
      if (!isTask) continue;

      const taskLi = listItem as HTMLElement;
      const taskIndex = this.getTaskIndex(taskLi);
      if (taskIndex !== this.getCurrentTaskIndex(editor, i)) continue;

      const newLine = checkbox.checked
        ? line.replace(TASK_UNCHECKED_PATTERN, "- [x] ")
        : line.replace(TASK_CHECKED_PATTERN, "- [ ] ");

      if (this.settings.taskListShowDates && checkbox.checked) {
        const dateStr = new Date().toISOString().slice(0, 10);
        const newLineWithDate = newLine.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/, "") + ` ✅ ${dateStr}`;
        editor.setLine(i, newLineWithDate);
      } else {
        editor.setLine(i, newLine);
      }
      break;
    }
  }

  private toggleTaskInContent(content: string, checked: boolean): string {
    const lines = content.split("\n");
    const newLines = lines.map((line) => {
      if (checked && TASK_UNCHECKED_PATTERN.test(line)) {
        return line.replace(TASK_UNCHECKED_PATTERN, "- [x] ");
      }
      if (!checked && TASK_CHECKED_PATTERN.test(line)) {
        return line.replace(TASK_CHECKED_PATTERN, "- [ ] ");
      }
      return line;
    });
    return newLines.join("\n");
  }

  private getTaskIndex(li: HTMLElement): number {
    const parent = li.parentElement;
    if (!parent) return 0;
    const siblings = Array.from(parent.querySelectorAll(":scope > li"));
    return siblings.indexOf(li);
  }

  private getCurrentTaskIndex(editor: Editor, line: number): number {
    return line;
  }

  private addTaskDates(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    const taskItems = el.querySelectorAll(".mdbridge-task-item.mdbridge-task-done");
    taskItems.forEach((item) => {
      const li = item as HTMLElement;
      if (li.querySelector(".mdbridge-task-date")) return;

      const dateSpan = document.createElement("span");
      dateSpan.addClass("mdbridge-task-date");
      const text = li.textContent || "";
      const dateMatch = text.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        dateSpan.textContent = ` (done: ${dateMatch[1]})`;
        li.appendChild(dateSpan);
      }
    });
  }

  private definitionListProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableDefinitionLists) return;

    const rawHtml = el.innerHTML;
    if (!rawHtml.includes("\n: ")) return;

    const converted = this.convertDefinitionLists(rawHtml);
    if (converted !== rawHtml) {
      el.innerHTML = converted;
    }
  }

  convertDefinitionLists(html: string): string {
    return html.replace(
      /<p>([^<]+(?:<\/?[^p>]+>[^<]*)*)\n:\s(.+?)(?:<\/p>|(?=<p>|$))/g,
      (match, term, definition) => {
        const cleanTerm = term.replace(/<[^>]+>/g, "").trim();
        const cleanDef = definition.replace(/<[^>]+>/g, "").trim();
        return `<dl class="mdbridge-deflist"><dt>${cleanTerm}</dt><dd>${cleanDef}</dd></dl>`;
      },
    );
  }

  private definitionListCodeBlockProcessor(
    source: string,
    el: HTMLElement,
    _ctx: MarkdownPostProcessorContext,
  ): void {
    if (!this.settings.enableDefinitionLists) return;

    const lines = source.trim().split("\n");
    const dl = document.createElement("dl");
    dl.addClass("mdbridge-deflist");
    dl.addClass("mdbridge-deflist-codeblock");

    let currentTerm: string | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === "") {
        currentTerm = null;
        continue;
      }
      if (trimmed.startsWith(":")) {
        const def = trimmed.slice(1).trim();
        if (currentTerm) {
          const dd = document.createElement("dd");
          dd.textContent = def;
          dl.appendChild(dd);
        }
      } else {
        currentTerm = trimmed;
        const dt = document.createElement("dt");
        dt.textContent = trimmed;
        dl.appendChild(dt);
      }
    }

    el.appendChild(dl);
  }
}
