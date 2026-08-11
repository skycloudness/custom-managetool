'use strict';

const { parse, format, minify, validate, parseAttributes } = require('../src/htmlTool');

describe('minify', () => {
  test('collapses whitespace between tags', () => {
    const input = '<html>\n  <body>\n    <p>Hello</p>\n  </body>\n</html>';
    expect(minify(input)).toBe('<html><body><p>Hello</p></body></html>');
  });

  test('trims leading/trailing whitespace', () => {
    expect(minify('  <p>Hi</p>  ')).toBe('<p>Hi</p>');
  });

  test('throws for non-string input', () => {
    expect(() => minify(null)).toThrow(TypeError);
  });
});

describe('format', () => {
  test('indents nested tags', () => {
    const input = '<html><body><p>Hello</p></body></html>';
    const result = format(input);
    expect(result).toBe(
      '<html>\n  <body>\n    <p>\n      Hello\n    </p>\n  </body>\n</html>',
    );
  });

  test('respects custom indent option', () => {
    const input = '<div><span>text</span></div>';
    const result = format(input, { indent: 4 });
    expect(result).toContain('    <span>');
  });

  test('does not indent inside void elements', () => {
    const input = '<div><br/><p>text</p></div>';
    const result = format(input);
    expect(result).not.toMatch(/br>\n\s+/);
  });

  test('throws for non-string input', () => {
    expect(() => format(42)).toThrow(TypeError);
  });
});

describe('parse', () => {
  test('parses doctype', () => {
    const tokens = parse('<!DOCTYPE html><html></html>');
    expect(tokens[0]).toMatchObject({ type: 'doctype' });
  });

  test('parses open and close tags', () => {
    const tokens = parse('<div><p>Hello</p></div>');
    const types = tokens.map((t) => t.type);
    expect(types).toEqual(['open', 'open', 'text', 'close', 'close']);
  });

  test('parses self-closing tags', () => {
    const tokens = parse('<img src="photo.jpg" />');
    expect(tokens[0]).toMatchObject({ type: 'selfclose', name: 'img' });
    expect(tokens[0].attributes.src).toBe('photo.jpg');
  });

  test('parses comments', () => {
    const tokens = parse('<!-- a comment -->');
    expect(tokens[0]).toMatchObject({ type: 'comment', content: 'a comment' });
  });

  test('parses text nodes', () => {
    const tokens = parse('<p>Hello world</p>');
    expect(tokens[1]).toMatchObject({ type: 'text', content: 'Hello world' });
  });

  test('throws for non-string input', () => {
    expect(() => parse(undefined)).toThrow(TypeError);
  });
});

describe('parseAttributes', () => {
  test('parses double-quoted attributes', () => {
    const attrs = parseAttributes('<a href="https://example.com" target="_blank">');
    expect(attrs.href).toBe('https://example.com');
    expect(attrs.target).toBe('_blank');
  });

  test('parses boolean attributes', () => {
    const attrs = parseAttributes('<input disabled>');
    expect(attrs.disabled).toBe(true);
  });
});

describe('validate', () => {
  test('returns no issues for valid HTML', () => {
    const html = '<!DOCTYPE html><html><head></head><body><p>Hi</p></body></html>';
    expect(validate(html)).toEqual([]);
  });

  test('warns about missing DOCTYPE', () => {
    const issues = validate('<html><body></body></html>');
    expect(issues.some((i) => i.message.includes('DOCTYPE'))).toBe(true);
  });

  test('reports unclosed tags', () => {
    const issues = validate('<!DOCTYPE html><html><body><div></body></html>');
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });

  test('reports unexpected closing tag', () => {
    const issues = validate('<!DOCTYPE html></p>');
    expect(issues.some((i) => i.message.includes('Unexpected closing tag'))).toBe(true);
  });

  test('throws for non-string input', () => {
    expect(() => validate(123)).toThrow(TypeError);
  });
});
