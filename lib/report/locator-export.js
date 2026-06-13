/**
 * Convert Playwright internal selector strings to exported Playwright API chains.
 */
export function internalSelectorToExpression(selector) {
  if (!selector || typeof selector !== 'string') {
    return null;
  }

  if (selector.includes(' >> ')) {
    return buildSelectorChainExpression(splitSelectorChain(selector));
  }

  if (selector.startsWith('internal:')) {
    return buildSelectorChainExpression([selector]);
  }

  return `page.locator(${JSON.stringify(selector)})`;
}

function buildSelectorChainExpression(parts) {
  const expressions = parts.map(parseSelectorPart).filter(Boolean);
  if (expressions.length === 0) {
    return null;
  }

  return expressions.reduce((current, next) => {
    if (!current) {
      return next.startsWith('page.') ? next : `page.${next}`;
    }
    if (next.startsWith('page.')) {
      return next.replace(/^page\./, `${current}.`);
    }
    return `${current}.${next}`;
  }, null);
}

function splitSelectorChain(selector) {
  return selector
    .split(' >> ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseSelectorPart(part) {
  if (part.startsWith('internal:role=')) {
    const body = part.slice('internal:role='.length);
    const parsed = parseRoleSelector(body);
    if (!parsed) {
      return null;
    }
    const args = [JSON.stringify(parsed.role)];
    const options = {};
    if (parsed.name != null) {
      options.name = parsed.name;
    }
    if (parsed.exact) {
      options.exact = true;
    }
    if (Object.keys(options).length > 0) {
      args.push(JSON.stringify(options));
    }
    return `page.getByRole(${args.join(', ')})`;
  }

  if (part.startsWith('internal:text=')) {
    const body = part.slice('internal:text='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    const args = [JSON.stringify(parsed.value)];
    if (parsed.insensitive) {
      args.push(JSON.stringify({ exact: false }));
    }
    return `page.getByText(${args.join(', ')})`;
  }

  if (part.startsWith('internal:label=')) {
    const body = part.slice('internal:label='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    return `page.getByLabel(${JSON.stringify(parsed.value)})`;
  }

  if (part.startsWith('internal:placeholder=')) {
    const body = part.slice('internal:placeholder='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    return `page.getByPlaceholder(${JSON.stringify(parsed.value)})`;
  }

  if (part.startsWith('internal:alt=')) {
    const body = part.slice('internal:alt='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    return `page.getByAltText(${JSON.stringify(parsed.value)})`;
  }

  if (part.startsWith('internal:testid=')) {
    const body = part.slice('internal:testid='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    return `page.getByTestId(${JSON.stringify(parsed.value)})`;
  }

  if (part.startsWith('internal:has-text=')) {
    const body = part.slice('internal:has-text='.length);
    const parsed = parseQuotedValue(body);
    if (!parsed) {
      return null;
    }
    return `filter({ hasText: ${JSON.stringify(parsed.value)} })`;
  }

  if (part.startsWith('nth=')) {
    const index = Number.parseInt(part.slice('nth='.length), 10);
    if (Number.isNaN(index)) {
      return null;
    }
    if (index === 0) {
      return 'first()';
    }
    return `nth(${index})`;
  }

  if (part === 'first') {
    return 'first()';
  }

  if (part === 'last') {
    return 'last()';
  }

  if (part.startsWith('visible=')) {
    return `filter({ visible: ${part.slice('visible='.length) === 'true' ? 'true' : 'false'} })`;
  }

  return `page.locator(${JSON.stringify(part)})`;
}

function parseRoleSelector(body) {
  const match = body.match(
    /^([a-zA-Z0-9_-]+)(?:\[name=((?:\"(?:\\.|[^\"])*\")|(?:'(?:\\.|[^'])*'))(?:,exact=true)?\])?(i)?$/,
  );
  if (!match) {
    return { role: body.replace(/\[.*$/, ''), name: null, exact: false };
  }

  const role = match[1];
  const exact = body.includes('exact=true');
  let name = null;
  if (match[2]) {
    try {
      name = JSON.parse(match[2].replace(/^'|'$/g, '"'));
    } catch {
      name = match[2].slice(1, -1);
    }
  }

  return { role, name, exact };
}

function parseQuotedValue(body) {
  const insensitive = body.endsWith('i');
  const trimmed = insensitive ? body.slice(0, -1) : body;
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return {
        value: JSON.parse(trimmed.replace(/^'|'$/g, (quote) => (quote === "'" ? '"' : quote))),
        insensitive,
      };
    } catch {
      return { value: trimmed.slice(1, -1), insensitive };
    }
  }

  return { value: trimmed, insensitive };
}

export function frameMethodUsesSelector(method) {
  return new Set([
    'click',
    'dblclick',
    'fill',
    'type',
    'press',
    'check',
    'uncheck',
    'selectOption',
    'hover',
    'tap',
    'focus',
    'blur',
    'textContent',
    'innerText',
    'inputValue',
    'setInputFiles',
    'waitForSelector',
  ]).has(method);
}

export function normalizeTraceAction(before, after) {
  const params = before.params ?? {};
  const method = before.method;
  const className = before.class;

  if (
    (className === 'Frame' || className === 'Page') &&
    frameMethodUsesSelector(method) &&
    params.selector
  ) {
    const locatorExpression = internalSelectorToExpression(params.selector);
    if (locatorExpression) {
      return {
        callId: after.callId,
        class: 'Locator',
        method,
        apiName: `${stripPagePrefix(locatorExpression)}.${method}`,
        params: { ...params, locatorExpression },
        result: after.result ?? null,
        error: after.error ?? null,
        startTime: before.startTime,
        endTime: after.endTime,
        durationMs: Math.max(0, after.endTime - before.startTime),
        pageId: before.pageId ?? null,
        frameId: before.frameId ?? null,
      };
    }
  }

  return {
    callId: after.callId,
    class: className,
    method,
    apiName: `${classToApiRoot(className)}.${method}`,
    params,
    result: after.result ?? null,
    error: after.error ?? null,
    startTime: before.startTime,
    endTime: after.endTime,
    durationMs: Math.max(0, after.endTime - before.startTime),
    pageId: before.pageId ?? null,
    frameId: before.frameId ?? null,
  };
}

function stripPagePrefix(expression) {
  return expression.startsWith('page.') ? expression.slice('page.'.length) : expression;
}

function classToApiRoot(className) {
  switch (className) {
    case 'Frame':
    case 'Page':
      return 'page';
    case 'Locator':
      return 'locator';
    case 'ElementHandle':
      return 'elementHandle';
    case 'Keyboard':
      return 'keyboard';
    case 'Mouse':
      return 'mouse';
    default:
      return className.toLowerCase();
  }
}
