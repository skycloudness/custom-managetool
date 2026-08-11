'use strict';

/**
 * HTML Tool - utilities for managing HTML content.
 * Provides: parse, format (pretty-print), validate, and minify.
 */

/**
 * Minify HTML by collapsing whitespace between tags and trimming.
 * @param {string} html
 * @returns {string}
 */
function minify(html) {
  if (typeof html !== 'string') throw new TypeError('html must be a string');
  return html
    .replace(/[ \t]*\n[ \t]*/g, '')
    .replace(/>[ \t]+</g, '><')
    .trim();
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

  // Void elements that should not be indented inside
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  // Split into tokens: comments, closing tags, any other tags, or text runs
  // Note: we match all tags as <[^>]*> and infer type from the matched string
  const tokenRe = /(<!--[\s\S]*?--!?>|<\/[a-zA-Z][^>]*>|<[^>]*>|[^<]+)/g;
  const tokens = html.match(tokenRe) || [];

  let level = 0;
  const lines = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (/^<!--/.test(trimmed)) {
      // Comment
      lines.push(pad.repeat(level) + trimmed);
    } else if (/^<\//.test(trimmed)) {
      // Closing tag
      level = Math.max(0, level - 1);
      lines.push(pad.repeat(level) + trimmed);
    } else if (/^<[^/]/.test(trimmed)) {
      // Opening tag
      lines.push(pad.repeat(level) + trimmed);
      const tagName = (trimmed.match(/^<([a-zA-Z][a-zA-Z0-9:-]*)/) || [])[1];
      const isSelfClosing = /\/>$/.test(trimmed);
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

  const tokenRe = /(<!DOCTYPE[^>]*>|<!--[\s\S]*?--!?>|<\/[a-zA-Z][^>]*>|<[^>]*>|[^<]+)/gi;
  const tokens = html.match(tokenRe) || [];
  const result = [];

  for (const raw of tokens) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (/^<!DOCTYPE/i.test(trimmed)) {
      result.push({ type: 'doctype', raw: trimmed });
    } else if (/^<!--/.test(trimmed)) {
      const content = trimmed.replace(/^<!--/, '').replace(/--!?>$/, '').trim();
      result.push({ type: 'comment', raw: trimmed, content });
    } else if (/^<\//.test(trimmed)) {
      const name = (trimmed.match(/^<\/([a-zA-Z][a-zA-Z0-9:-]*)/) || [])[1] || '';
      result.push({ type: 'close', raw: trimmed, name });
    } else if (/\/>$/.test(trimmed)) {
      const name = (trimmed.match(/^<([a-zA-Z][a-zA-Z0-9:-]*)/) || [])[1] || '';
      const attributes = parseAttributes(trimmed);
      result.push({ type: 'selfclose', raw: trimmed, name, attributes });
    } else if (/^<[^/]/.test(trimmed)) {
      const name = (trimmed.match(/^<([a-zA-Z][a-zA-Z0-9:-]*)/) || [])[1] || '';
      const attributes = parseAttributes(trimmed);
      result.push({ type: 'open', raw: trimmed, name, attributes });
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
