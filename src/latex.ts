import katex from "katex";
import "katex/dist/contrib/mhchem.min.js";
import { App, MarkdownPostProcessorContext, Plugin } from "obsidian";
import { MDBridgeSettings } from "./types";

const INLINE_MATH_PATTERN = /\$([^\$\n]+?)\$/g;
const BLOCK_MATH_PATTERN = /\$\$([\s\S]+?)\$\$/g;

function safeRenderKatex(tex: string, displayMode: boolean, className: string): HTMLElement {
  const container = createEl("span");
  container.className = className;
  try {
    katex.render(tex, container, {
      displayMode,
      throwOnError: true,
      output: "html",
      strict: false,
    });
  } catch {
    container.textContent = tex;
    container.addClass("mdbridge-math-error");
  }
  return container;
}

export class LatexProcessor {
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
    plugin.registerMarkdownPostProcessor(this.mathPostProcessor.bind(this));
    plugin.registerMarkdownCodeBlockProcessor("math", this.mathCodeBlockProcessor.bind(this));
    plugin.registerMarkdownCodeBlockProcessor("chem", this.chemCodeBlockProcessor.bind(this));
  }

  private mathPostProcessor(el: HTMLElement, _ctx: MarkdownPostProcessorContext): void {
    if (!this.settings.enableLatex) return;
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

      const fragment = this.buildBlockMathFragment(text);
      if (fragment) {
        parent.replaceChild(fragment, textNode);
      }
    }
  }

  private buildBlockMathFragment(text: string): DocumentFragment | null {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let found = false;
    const pattern = new RegExp(BLOCK_MATH_PATTERN.source, "g");
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      found = true;
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }
      const wrapper = createEl("div");
      wrapper.className = "mdbridge-math mdbridge-math-block";
      try {
        katex.render(match[1].trim(), wrapper, {
          displayMode: true,
          throwOnError: true,
          output: "html",
          strict: false,
        });
      } catch {
        wrapper.textContent = match[1].trim();
        wrapper.addClass("mdbridge-math-error");
      }
      fragment.appendChild(wrapper);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    return found ? fragment : null;
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

      const fragment = this.buildInlineMathFragment(text);
      if (fragment) {
        parent.replaceChild(fragment, textNode);
      }
    }
  }

  private buildInlineMathFragment(text: string): DocumentFragment | null {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let found = false;
    const pattern = new RegExp(INLINE_MATH_PATTERN.source, "g");
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      found = true;
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index)),
        );
      }
      const span = safeRenderKatex(
        match[1],
        false,
        "mdbridge-math mdbridge-math-inline",
      );
      fragment.appendChild(span);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    return found ? fragment : null;
  }

  private mathCodeBlockProcessor(
    source: string,
    el: HTMLElement,
    _ctx: MarkdownPostProcessorContext,
  ): void {
    if (!this.settings.enableLatex) return;

    const trimmed = source.trim();
    const isBlock = source.includes("\n") || trimmed.length > 50;

    const container = createEl("div");
    container.className = isBlock
      ? "mdbridge-math mdbridge-math-codeblock"
      : "mdbridge-math mdbridge-math-inline";
    try {
      katex.render(trimmed, container, {
        displayMode: isBlock,
        throwOnError: true,
        output: "html",
        strict: false,
      });
    } catch {
      container.textContent = trimmed;
      container.addClass("mdbridge-math-error");
    }

    el.appendChild(container);
  }

  private chemCodeBlockProcessor(
    source: string,
    el: HTMLElement,
    _ctx: MarkdownPostProcessorContext,
  ): void {
    if (!this.settings.enableLatex) return;

    const trimmed = source.trim();
    const container = createEl("div");
    container.className = "mdbridge-math mdbridge-chem";
    try {
      katex.render(trimmed, container, {
        displayMode: true,
        throwOnError: true,
        output: "html",
        strict: false,
      });
    } catch {
      container.textContent = trimmed;
      container.addClass("mdbridge-math-error");
    }

    el.appendChild(container);
  }

  renderToString(tex: string, displayMode: boolean): string {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: true,
        output: "html",
        strict: false,
      });
    } catch {
      const escaped = tex.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<span class="mdbridge-math-error">${escaped}</span>`;
    }
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
