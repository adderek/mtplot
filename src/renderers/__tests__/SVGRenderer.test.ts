import { SVGRenderer } from '../SVGRenderer';

describe('SVGRenderer', () => {
  let container: HTMLElement;
  let renderer: SVGRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new SVGRenderer(container, 800, 600);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('initialization', () => {
    it('should create SVG element with correct dimensions', () => {
      const svg = renderer.getSVGElement();
      expect(svg.getAttribute('width')).toBe('800');
      expect(svg.getAttribute('height')).toBe('600');
      expect(svg.getAttribute('class')).toBe('mtplot-svg');
    });
  });

  describe('tooltip', () => {
    it('should show tooltip with correct text', () => {
      renderer.showTooltip('Test tooltip', 100, 100);
      const tooltip = container.querySelector('text');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toBe('Test tooltip');
    });

    it('should hide tooltip', () => {
      renderer.showTooltip('Test tooltip', 100, 100);
      renderer.hideTooltip();
      const tooltip = container.querySelector('text');
      expect(tooltip?.style.display).toBe('none');
    });

    it('should position tooltip within bounds', () => {
      // Test right edge
      renderer.showTooltip('Test tooltip', 790, 100);
      let tooltip = container.querySelector('text');
      let transform = tooltip?.getAttribute('transform');
      expect(Number(transform?.match(/translate\(([\d.-]+)/)?.[1])).toBeLessThan(800);

      // Test bottom edge
      renderer.showTooltip('Test tooltip', 100, 590);
      tooltip = container.querySelector('text');
      transform = tooltip?.getAttribute('transform');
      expect(Number(transform?.match(/translate\([\d.-]+,\s*([\d.-]+)/)?.[1])).toBeLessThan(600);
    });
  });

  describe('bar drawing', () => {
    it('should draw bar with correct dimensions', () => {
      renderer.drawBar(100, 100, 50, 200, '#ff0000');
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('x')).toBe('100');
      expect(rect?.getAttribute('y')).toBe('100');
      expect(rect?.getAttribute('width')).toBe('50');
      expect(rect?.getAttribute('height')).toBe('200');
      expect(rect?.getAttribute('fill')).toBe('#ff0000');
    });

    it('should draw bar with tooltip when interactive', () => {
      renderer.drawBar(100, 100, 50, 200, '#ff0000', { 
        interactive: true,
        tooltip: 'Test tooltip'
      });
      const rect = container.querySelector('rect');
      expect(rect?.getAttribute('data-tooltip')).toBe('Test tooltip');
      expect(rect?.style.cursor).toBe('pointer');
    });
  });
});
