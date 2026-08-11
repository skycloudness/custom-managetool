'use strict';

/**
 * HTML Tool - utilities for managing HTML content.
 * Provides: parse, format (pretty-print), validate, and minify.
 */

/**
 * Split HTML into raw token strings using a linear state machine.
 * Handles text nodes, comments (ending with --> or --!>), and tags.
 * @param {string} html
 * @returns {string[]}
 */
function tokenizeRaw(html) {
  const tokens = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] !== '<') {
      // Text node — read until the next '<'
      let j = i + 1;
      while (j < html.length && html[j] !== '<') j++;
      tokens.push(html.slice(i, j));
      i = j;
    } else if (html.startsWith('<!--', i)) {
      // HTML comment — scan for --> or --!>
      let j = i + 4;
      let closed = false;
      while (j < html.length) {
        if (html[j] === '-' && html[j + 1] === '-') {
          if (html[j + 2] === '>') {
            j += 3;
            closed = true;
            break;
          }
          if (html[j + 2] === '!' && html[j + 3] === '>') {
            j += 4;
            closed = true;
            break;
          }
        }
        j++;
      }
      if (!closed) j = html.length;
      tokens.push(html.slice(i, j));
      i = j;
    } else {
      // Regular tag — read until '>'
      let j = i + 1;
      while (j < html.length && html[j] !== '>') j++;
      if (j < html.length) j++; // include '>'
      tokens.push(html.slice(i, j));
      i = j;
    }
  }

  return tokens;
}

/**
 * Minify HTML by removing newlines and collapsing whitespace between tags.
 * @param {string} html
 * @returns {string}
 */
function minify(html) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  // Remove newlines, then collapse spaces/tabs between tags
  let result = '';
  for (let i = 0; i < html.length; i++) {
    if (html[i] !== '\n') result += html[i];
  }
  // Collapse whitespace between > and <
  return result.replace(/>([ \t]+)</g, '><').trim();
}

/**
 * Format (pretty-print) HTML with indentation.
 * @param {string} html
 * @param {object} [options]
 * @param {number} [options.indent=2] - spaces per indent level
 * @returns {string}
 */
function format(html, options = {}) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  const indent = options.indent !== undefined ? options.indent : 2;
  const pad = ' '.repeat(indent);

  // Void elements that should not increase indent level
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  const tokens = tokenizeRaw(html);
  let level = 0;
  const lines = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('<!--')) {
      // Comment
      lines.push(pad.repeat(level) + trimmed);
    } else if (trimmed.startsWith('</')) {
      // Closing tag
      level = Math.max(0, level - 1);
      lines.push(pad.repeat(level) + trimmed);
    } else if (trimmed.startsWith('<')) {
      // Opening or self-closing tag
      lines.push(pad.repeat(level) + trimmed);
      const m = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(trimmed);
      const tagName = m ? m[1] : '';
      const isSelfClosing = trimmed.endsWith('/>');
      if (tagName && !isSelfClosing && !voidElements.has(tagName.toLowerCase())) {
        level += 1;
      }
    } else {
      // Text node
      lines.push(pad.repeat(level) + trimmed);
    }
  }

  return lines.join('\n');
}

/**
 * Parse HTML into a simple token array.
 * Each token is an object: { type, raw, [name], [attributes], [content] }
 * Types: 'doctype' | 'comment' | 'open' | 'close' | 'selfclose' | 'text'
 * @param {string} html
 * @returns {Array<object>}
 */
function parse(html) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');

  const raw = tokenizeRaw(html);
  const result = [];

  for (const token of raw) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (/^<!DOCTYPE/i.test(trimmed)) {
      result.push({ type: 'doctype', raw: trimmed });
    } else if (trimmed.startsWith('<!--')) {
      // Strip comment delimiters: <!-- ... --> or <!-- ... --!>
      const inner = trimmed.slice(4);
      let content = inner;
      if (content.endsWith('--!>')) content = content.slice(0, -4);
      else if (content.endsWith('-->')) content = content.slice(0, -3);
      result.push({ type: 'comment', raw: trimmed, content: content.trim() });
    } else if (trimmed.startsWith('</')) {
      const m = /^<\/([a-zA-Z][a-zA-Z0-9:-]*)/.exec(trimmed);
      const name = m ? m[1] : '';
      result.push({ type: 'close', raw: trimmed, name });
    } else if (trimmed.startsWith('<')) {
      const m = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(trimmed);
      const name = m ? m[1] : '';
      const isSelfClosing = trimmed.endsWith('/>');
      const attributes = parseAttributes(trimmed);
      result.push({ type: isSelfClosing ? 'selfclose' : 'open', raw: trimmed, name, attributes });
    } else {
      result.push({ type: 'text', raw: trimmed, content: trimmed });
    }
  }

  return result;
}

/**
 * Parse attributes from a tag string into key/value pairs.
 * @param {string} tag
 * @returns {object}
 */
function parseAttributes(tag) {
  const attrs = {};
  // Remove tag name and surrounding < >
  const inner = tag.replace(/^<[a-zA-Z][a-zA-Z0-9:-]*\s*/, '').replace(/\/?>$/, '');
  const attrRe = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>/]+)))?/g;
  let match;
  while ((match = attrRe.exec(inner)) !== null) {
    const key = match[1];
    const value = match[2] !== undefined ? match[2]
      : match[3] !== undefined ? match[3]
      : match[4] !== undefined ? match[4]
      : true;
    attrs[key] = value;
  }
  return attrs;
}

/**
 * Validate HTML for common issues.
 * Returns an array of { level, message } objects.
 * @param {string} html
 * @returns {Array<{level: string, message: string}>}
 */
function validate(html) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');

  const issues = [];
  const tokens = parse(html);

  // Check for DOCTYPE
  const hasDoctype = tokens.some((t) => t.type === 'doctype');
  if (!hasDoctype) {
    issues.push({ level: 'warning', message: 'Missing <!DOCTYPE html> declaration' });
  }

  // Tag balance check
  const stack = [];
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  for (const token of tokens) {
    if (token.type === 'open') {
      if (!voidElements.has(token.name.toLowerCase())) {
        stack.push(token.name.toLowerCase());
      }
    } else if (token.type === 'close') {
      const name = token.name.toLowerCase();
      if (stack.length === 0) {
        issues.push({ level: 'error', message: `Unexpected closing tag </${name}>` });
      } else if (stack[stack.length - 1] !== name) {
        issues.push({
          level: 'error',
          message: `Mismatched tag: expected </${stack[stack.length - 1]}>, got </${name}>`,
        });
      } else {
        stack.pop();
      }
    }
  }

  for (const unclosed of stack) {
    issues.push({ level: 'error', message: `Unclosed tag <${unclosed}>` });
  }

  return issues;
}

module.exports = { parse, format, minify, validate, parseAttributes };

