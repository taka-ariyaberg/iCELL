import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomePage } from './HomePage';

// The test environment is node (no DOM), so the element tree is walked
// directly: function components are expanded by calling them (the home page
// uses no hooks) and host elements are collected.
type HostElement = React.ReactElement<{ children?: React.ReactNode; onClick?: () => void }>;
type FunctionComponent = (props: unknown) => React.ReactNode;

function collectHostElements(node: React.ReactNode, out: HostElement[] = []): HostElement[] {
  if (Array.isArray(node)) {
    node.forEach((child) => collectHostElements(child, out));
  } else if (React.isValidElement(node)) {
    const el = node as HostElement;
    if (typeof el.type === 'function') {
      collectHostElements((el.type as FunctionComponent)(el.props), out);
    } else {
      out.push(el);
      collectHostElements(el.props.children, out);
    }
  }
  return out;
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) {
    const el = node as HostElement;
    if (typeof el.type === 'function') return textOf((el.type as FunctionComponent)(el.props));
    return textOf(el.props.children);
  }
  return '';
}

function renderHome() {
  const onNewProject = vi.fn();
  const onImportFiles = vi.fn();
  const tree = React.createElement(HomePage, { onNewProject, onImportFiles });
  const buttons = collectHostElements(tree).filter((el) => el.type === 'button');
  const buttonLabelled = (label: string) => buttons.find((b) => textOf(b.props.children).includes(label));
  return { onNewProject, onImportFiles, buttons, buttonLabelled };
}

describe('HomePage', () => {
  it('renders exactly two start actions', () => {
    expect(renderHome().buttons).toHaveLength(2);
  });

  it('New Project calls onNewProject and nothing else', () => {
    const { onNewProject, onImportFiles, buttonLabelled } = renderHome();
    buttonLabelled('New Project')?.props.onClick?.();
    expect(onNewProject).toHaveBeenCalledTimes(1);
    expect(onImportFiles).not.toHaveBeenCalled();
  });

  it('Import Files calls onImportFiles and nothing else', () => {
    const { onNewProject, onImportFiles, buttonLabelled } = renderHome();
    buttonLabelled('Import Files')?.props.onClick?.();
    expect(onImportFiles).toHaveBeenCalledTimes(1);
    expect(onNewProject).not.toHaveBeenCalled();
  });

  it('names actions by their visible titles and hides the decorative plate', () => {
    const html = renderToStaticMarkup(
      React.createElement(HomePage, { onNewProject: () => {}, onImportFiles: () => {} }),
    );
    // Button content is exactly the visible label (WCAG 2.5.3); the
    // description lives outside the button and is linked by id.
    expect(html).toMatch(/<button[^>]*aria-describedby="home-action-new-desc"[^>]*>New Project<\/button>/);
    expect(html).toMatch(/<button[^>]*aria-describedby="home-action-import-desc"[^>]*>Import Files<\/button>/);
    expect(html).toMatch(/<p id="home-action-new-desc"[^>]*>Design plate layout/);
    expect(html).toMatch(/<p id="home-action-import-desc"[^>]*>Upload existing plate layouts/);
    expect(html).toContain('<div class="home-plate" aria-hidden="true">');
    expect(html.match(/<li class="home-capability">/g)).toHaveLength(4);
  });
});
