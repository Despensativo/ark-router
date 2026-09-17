/**
 * Test Suite: Card Accordion / Collapsible Panel Verification
 * Tests all 12 cards, localStorage persistence, default active/inactive state,
 * ARIA attributes, and CSS rules.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OVERVIEW_JS = path.join(ROOT_DIR, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js');
const OVERVIEW_CSS = path.join(ROOT_DIR, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css');

console.log('--- 1. STATIC VERIFICATION: Overview JS & CSS ---');

const jsContent = fs.readFileSync(OVERVIEW_JS, 'utf-8');
const cssContent = fs.readFileSync(OVERVIEW_CSS, 'utf-8');

// 12 Required Cards
const TARGET_CARDS = [
  'multiwan',
  'sqm',
  'dmz',
  'wps',
  'wifi_env',
  'wifi6',
  'mesh',
  'devices',
  'adblock',
  'wireguard',
  'zerotier',
  'speedify'
];

for (const cardId of TARGET_CARDS) {
  const pattern = new RegExp(`id:\\s*['"]${cardId}['"]`);
  assert(pattern.test(jsContent), `Card ID "${cardId}" must be registered with setupCardAccordion in overview.js`);
  console.log(`  [OK] Card "${cardId}" configured with setupCardAccordion`);
}

// Verify CSS definitions
const REQUIRED_CSS_SELECTORS = [
  '.ex-card.is-collapsed',
  '.ex-accordion-header',
  '.ex-card-title-actions',
  '.ex-accordion-toggle-btn',
  '.ex-card-collapse-body',
  '.ex-card-collapse-inner',
  'grid-template-rows: 0fr',
  'grid-template-rows: 1fr'
];

for (const sel of REQUIRED_CSS_SELECTORS) {
  assert(cssContent.includes(sel), `CSS must include "${sel}"`);
  console.log(`  [OK] CSS contains "${sel}"`);
}

console.log('\n--- 2. LOGIC VERIFICATION: setupCardAccordion execution ---');

// Lightweight Mock DOM for testing setupCardAccordion
class MockClassList {
  constructor() {
    this._set = new Set();
  }
  add(...classes) {
    classes.forEach(c => this._set.add(c));
  }
  remove(...classes) {
    classes.forEach(c => this._set.delete(c));
  }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this._set.add(c);
      else this._set.delete(c);
      return force;
    }
    if (this._set.has(c)) {
      this._set.delete(c);
      return false;
    } else {
      this._set.add(c);
      return true;
    }
  }
  contains(c) {
    return this._set.has(c);
  }
}

class MockElement {
  constructor(tagName = 'div', attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.attributes = new Map();
    this.listeners = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.textContent = '';
    this.id = '';

    if (attrs.class) {
      attrs.class.split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
    }
    if (attrs.id) this.id = attrs.id;
    for (const [k, v] of Object.entries(attrs)) {
      if (k !== 'class' && k !== 'id') {
        this.attributes.set(k, String(v));
      }
    }
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k) {
    return this.attributes.get(k) ?? null;
  }

  hasAttribute(k) {
    return this.attributes.has(k);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    for (const h of handlers) {
      h.call(this, event);
    }
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (selector.includes(curr.tagName.toLowerCase())) return curr;
      if (selector.split(',').some(s => s.trim().startsWith('.') && curr.classList.contains(s.trim().slice(1)))) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  querySelector(sel) {
    for (const child of this.children) {
      if (sel.startsWith('.') && child.classList.contains(sel.slice(1))) return child;
      if (sel.startsWith('#') && child.id === sel.slice(1)) return child;
      const found = child.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
}

const mockStorage = new Map();
global.window = {
  localStorage: {
    getItem: (k) => mockStorage.get(k) ?? null,
    setItem: (k, v) => mockStorage.set(k, String(v)),
    removeItem: (k) => mockStorage.delete(k),
    clear: () => mockStorage.clear()
  }
};
global.document = {
  createElement: (tag) => new MockElement(tag)
};

function E(tag, attrs = {}, children = []) {
  const el = new MockElement(tag, attrs);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') {
      el.addEventListener(k, v);
    } else if (k !== 'class' && k !== 'id') {
      el.setAttribute(k, v);
    }
  }
  if (Array.isArray(children)) {
    for (const c of children) {
      if (typeof c === 'string') {
        el.innerHTML += c;
        el.textContent += c;
      } else if (c instanceof MockElement) {
        el.appendChild(c);
      }
    }
  } else if (typeof children === 'string') {
    el.innerHTML += children;
    el.textContent += children;
  }
  return el;
}
global.E = E;

// Extract setupCardAccordion from helpers.js
const helpersCode = fs.readFileSync(path.join(ROOT_DIR, 'src', 'core', 'helpers.js'), 'utf-8');
const setupAccordionFn = new Function('window', 'document', 'E', `${helpersCode}; return setupCardAccordion;`)(global.window, global.document, global.E);

// Test 2.1: First visit, service ACTIVE -> expanded by default
{
  mockStorage.clear();
  const cardEl = new MockElement('section', { class: 'ex-card' });
  const titleEl = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl = new MockElement('div', { class: 'ex-card-collapse-body' });
  cardEl.appendChild(titleEl);
  cardEl.appendChild(bodyEl);

  const acc = setupAccordionFn({
    id: 'test_active',
    cardEl,
    titleEl,
    bodyEl,
    isActive: true
  });

  assert.strictEqual(acc.isExpanded(), true, 'Active service must be expanded on first visit');
  assert.strictEqual(cardEl.classList.contains('is-collapsed'), false);
  assert.strictEqual(cardEl.classList.contains('is-expanded'), true);
  assert.strictEqual(bodyEl.getAttribute('aria-hidden'), 'false');
  assert.strictEqual(acc.expandBtn.getAttribute('aria-expanded'), 'true');
  assert(acc.expandBtn.innerHTML.includes('Recolher'));
  console.log('  [OK] First visit: Active service starts expanded');
}

// Test 2.2: First visit, service INACTIVE -> collapsed by default
{
  mockStorage.clear();
  const cardEl = new MockElement('section', { class: 'ex-card' });
  const titleEl = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl = new MockElement('div', { class: 'ex-card-collapse-body' });
  cardEl.appendChild(titleEl);
  cardEl.appendChild(bodyEl);

  const acc = setupAccordionFn({
    id: 'test_inactive',
    cardEl,
    titleEl,
    bodyEl,
    isActive: false
  });

  assert.strictEqual(acc.isExpanded(), false, 'Inactive service must be collapsed on first visit');
  assert.strictEqual(cardEl.classList.contains('is-collapsed'), true);
  assert.strictEqual(cardEl.classList.contains('is-expanded'), false);
  assert.strictEqual(bodyEl.getAttribute('aria-hidden'), 'true');
  assert.strictEqual(acc.expandBtn.getAttribute('aria-expanded'), 'false');
  assert(acc.expandBtn.innerHTML.includes('Expandir'));
  console.log('  [OK] First visit: Inactive service starts collapsed');
}

// Test 2.3: User interaction toggles state and persists to localStorage
{
  mockStorage.clear();
  const cardEl = new MockElement('section', { class: 'ex-card' });
  const titleEl = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl = new MockElement('div', { class: 'ex-card-collapse-body' });
  cardEl.appendChild(titleEl);
  cardEl.appendChild(bodyEl);

  const acc = setupAccordionFn({
    id: 'test_toggle',
    cardEl,
    titleEl,
    bodyEl,
    isActive: true
  });

  // Toggle to collapsed
  acc.toggle();
  assert.strictEqual(acc.isExpanded(), false);
  assert.strictEqual(mockStorage.get('ark_card_test_toggle'), '0');

  // Toggle to expanded
  acc.toggle();
  assert.strictEqual(acc.isExpanded(), true);
  assert.strictEqual(mockStorage.get('ark_card_test_toggle'), '1');
  console.log('  [OK] User toggle works and persists state to localStorage');
}

// Test 2.4: Subsequent visit respects saved state regardless of isActive
{
  mockStorage.set('ark_card_test_persisted', 'collapsed');
  const cardEl = new MockElement('section', { class: 'ex-card' });
  const titleEl = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl = new MockElement('div', { class: 'ex-card-collapse-body' });
  cardEl.appendChild(titleEl);
  cardEl.appendChild(bodyEl);

  // Even though isActive is true, saved state is 'collapsed'
  const acc = setupAccordionFn({
    id: 'test_persisted',
    cardEl,
    titleEl,
    bodyEl,
    isActive: true
  });

  assert.strictEqual(acc.isExpanded(), false, 'Should respect saved collapsed state even if isActive is true');
  console.log('  [OK] Subsequent visit respects saved collapsed state over active service');

  // And vice versa: saved 'expanded' even if isActive is false
  mockStorage.set('ark_card_test_persisted_exp', 'expanded');
  const cardEl2 = new MockElement('section', { class: 'ex-card' });
  const titleEl2 = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl2 = new MockElement('div', { class: 'ex-card-collapse-body' });
  cardEl2.appendChild(titleEl2);
  cardEl2.appendChild(bodyEl2);

  const acc2 = setupAccordionFn({
    id: 'test_persisted_exp',
    cardEl: cardEl2,
    titleEl: titleEl2,
    bodyEl: bodyEl2,
    isActive: false
  });

  assert.strictEqual(acc2.isExpanded(), true, 'Should respect saved expanded state even if isActive is false');
  console.log('  [OK] Subsequent visit respects saved expanded state over inactive service');
}

// Test 2.5: Header click event delegation ignores clicks on interactive children
{
  mockStorage.clear();
  const cardEl = new MockElement('section', { class: 'ex-card' });
  const titleEl = new MockElement('div', { class: 'ex-card-title' });
  const bodyEl = new MockElement('div', { class: 'ex-card-collapse-body' });
  const titleActions = new MockElement('div', { class: 'ex-card-title-actions' });
  const childBtn = new MockElement('button', { class: 'ex-mini-button' });
  titleActions.appendChild(childBtn);
  titleEl.appendChild(titleActions);
  cardEl.appendChild(titleEl);
  cardEl.appendChild(bodyEl);

  const acc = setupAccordionFn({
    id: 'test_click',
    cardEl,
    titleEl,
    bodyEl,
    isActive: true
  });

  // Click on interactive child inside titleActions should NOT toggle
  titleEl.dispatchEvent({
    type: 'click',
    target: childBtn,
    stopPropagation: () => {}
  });
  assert.strictEqual(acc.isExpanded(), true, 'Clicking child button must not toggle accordion');

  // Click on header itself SHOULD toggle
  titleEl.dispatchEvent({
    type: 'click',
    target: titleEl,
    stopPropagation: () => {}
  });
  assert.strictEqual(acc.isExpanded(), false, 'Clicking header must toggle accordion');
  console.log('  [OK] Header click delegation correctly handles and ignores interactive children');
}

console.log('\n>>> ALL 12 CARD ACCORDION TESTS PASSED! <<<');
