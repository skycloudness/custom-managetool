#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { parse, format, minify, validate } = require('../src/htmlTool');

const USAGE = `
Usage: html-tool <command> [options] [file]

Commands:
  format   [--indent N] <file>   Pretty-print HTML (default indent: 2)
  minify   <file>                Minify HTML
  validate <file>                Validate HTML and report issues
  parse    <file>                Parse HTML and print token list as JSON

Options:
  --indent N   Number of spaces for indentation (used with format)
  --help       Show this help message

Examples:
  html-tool format index.html
  html-tool format --indent 4 index.html
  html-tool minify index.html
  html-tool validate index.html
  html-tool parse index.html
`.trim();

function readInput(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: File not found: ${resolved}`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, 'utf8');
}

function run(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const command = args[0];
  let indent = 2;
  let fileArg;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--indent' && args[i + 1] !== undefined) {
      indent = parseInt(args[i + 1], 10);
      i++;
    } else if (!args[i].startsWith('--')) {
      fileArg = args[i];
    }
  }

  if (!fileArg) {
    console.error('Error: No input file specified.');
    console.log(USAGE);
    process.exit(1);
  }

  const html = readInput(fileArg);

  switch (command) {
    case 'format':
      process.stdout.write(format(html, { indent }) + '\n');
      break;
    case 'minify':
      process.stdout.write(minify(html) + '\n');
      break;
    case 'validate': {
      const issues = validate(html);
      if (issues.length === 0) {
        console.log('✓ No issues found.');
      } else {
        for (const issue of issues) {
          console.log(`[${issue.level.toUpperCase()}] ${issue.message}`);
        }
        const errors = issues.filter((i) => i.level === 'error');
        if (errors.length > 0) process.exit(1);
      }
      break;
    }
    case 'parse':
      process.stdout.write(JSON.stringify(parse(html), null, 2) + '\n');
      break;
    default:
      console.error(`Error: Unknown command "${command}"`);
      console.log(USAGE);
      process.exit(1);
  }
}

run(process.argv.slice(2));
