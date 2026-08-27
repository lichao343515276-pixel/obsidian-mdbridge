import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import { App, MarkdownPostProcessor, MarkdownPostProcessorContext, Plugin } from "obsidian";
import { MDBridgeSettings } from "./types";

const INLINE_MATH_PATTERN = /\$([^\$\n]+?)\$/g;
const BLOCK_MATH_PATTERN = /\$\$([\s\S]+?)\$\$/g;

export class LatexProcessor {
  private app: App;
  private settings: MDBridgeSettings;
  private cssLoaded = false;

  constructor(app: App, settings: MDBridgeSettings) {
    this.app = app;
    this.settings = settings;
  }

  updateSettings(settings: MDBridgeSettings): void {
    this.settings = settings;
  }

  registerPostProcessors(plugin: Plugin): void {
    plugin.registerMarkdownPostProcessor(this.mathPostProcessor.bind(this));
    plugin.registerMarkdownCodeBlockProcessor("math", this.mathCodeBlockProcessor.bind(this));
    plugin.registerMarkdownCodeBlockProcessor("chem", this.chemCodeBlockProcessor.bind(this));
  }

  ensureCssLoaded(): void {
    if (this.cssLoaded) return;
    this.injectKatexCss();
    this.cssLoaded = true;
  }

  private injectKatexCss(): void {
    const existing = document.querySelector('link[data-mdbridge-katex]');
    if (existing) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-mdbridge-katex", "true");
    link.href = "app://local.mdbridge/styles/katex.min.css";
    document.head.appendChild(link);
  }

  renderToString(tex: string, displayMode: boolean): string {
    try {
      const result = katex.renderToString(tex, {
        displayMode,
        throwOnError: true,
        output: "html",
        strict: false,
      });
      return result;
    } catch {
      return `<span class="mdbridge-math-error">${this.escapeHtml(tex)}</span>`;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  private mathPostProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableLatex) return;

    this.ensureCssLoaded();

    this.processBlockMath(el);
    this.processInlineMath(el);
  }

  private processBlockMath(el: HTMLElement): void {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.textContent || "";
        return text.includes("$$") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
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
      if (!text.includes("$$")) continue;

      const parent = textNode.parentElement;
      if (!parent) continue;
      if (parent.closest(".mdbridge-math, code, pre")) continue;

      const html = this.convertBlockMath(text);
      if (html !== text) {
        const span = document.createElement("span");
        span.innerHTML = html;
        parent.replaceChild(span, textNode);
      }
    }
  }

  private convertBlockMath(text: string): string {
    return text.replace(BLOCK_MATH_PATTERN, (_match, formula: string) => {
      const trimmed = formula.trim();
      return `<div class="mdbridge-math mdbridge-math-block">${this.renderToString(trimmed, true)}</div>`;
    });
  }

  private processInlineMath(el: HTMLElement): void {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.textContent || "";
        return text.includes("$") && !text.includes("$$") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
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
      if (!text.includes("$")) continue;

      const parent = textNode.parentElement;
      if (!parent) continue;
      if (parent.closest(".mdbridge-math, code, pre")) continue;

      const html = this.convertInlineMath(text);
      if (html !== text) {
        const span = document.createElement("span");
        span.innerHTML = html;
        parent.replaceChild(span, textNode);
      }
    }
  }

  private convertInlineMath(text: string): string {
    return text.replace(INLINE_MATH_PATTERN, (_match, formula: string) => {
      return `<span class="mdbridge-math mdbridge-math-inline">${this.renderToString(formula, false)}</span>`;
    });
  }

  private mathCodeBlockProcessor(
    source: string,
    el: HTMLElement,
    _ctx: MarkdownPostProcessorContext,
  ): void {
    if (!this.settings.enableLatex) return;

    this.ensureCssLoaded();

    const trimmed = source.trim();
    const isBlock = source.includes("\n") || trimmed.length > 50;

    const container = document.createElement("div");
    container.className = isBlock
      ? "mdbridge-math mdbridge-math-codeblock"
      : "mdbridge-math mdbridge-math-inline";
    container.innerHTML = this.renderToString(trimmed, isBlock);

    el.appendChild(container);
  }

  private chemCodeBlockProcessor(
    source: string,
    el: HTMLElement,
    _ctx: MarkdownPostProcessorContext,
  ): void {
    if (!this.settings.enableLatex) return;

    this.ensureCssLoaded();

    const trimmed = source.trim();
    const container = document.createElement("div");
    container.className = "mdbridge-math mdbridge-chem";
    container.innerHTML = this.renderToString(trimmed, true);

    el.appendChild(container);
  }

  convertInlineToHtml(text: string): string {
    return text.replace(INLINE_MATH_PATTERN, (_match, formula: string) => {
      return `<span class="mdbridge-math mdbridge-math-inline">${this.renderToString(formula, false)}</span>`;
    });
  }

  convertBlockToHtml(text: string): string {
    return text.replace(BLOCK_MATH_PATTERN, (_match, formula: string) => {
      const trimmed = formula.trim();
      return `<div class="mdbridge-math mdbridge-math-block">${this.renderToString(trimmed, true)}</div>`;
    });
  }

  convertChemToHtml(tex: string, displayMode = true): string {
    return this.renderToString(tex, displayMode);
  }
}
