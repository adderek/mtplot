(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.MTPlot = {}));
})(this, (function (exports) { 'use strict';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    class SVGRenderer {
        constructor(container, width, height) {
            this.width = width;
            this.height = height;
            this.svg = document.createElementNS(SVG_NS, 'svg');
            this.svg.setAttribute('width', width.toString());
            this.svg.setAttribute('height', height.toString());
            this.svg.setAttribute('class', 'mtplot-svg');
            // Create defs for gradients and patterns
            this.defs = document.createElementNS(SVG_NS, 'defs');
            this.svg.appendChild(this.defs);
            // Create main group for transformation
            this.mainGroup = document.createElementNS(SVG_NS, 'g');
            this.svg.appendChild(this.mainGroup);
            // Create tooltip elements
            this.tooltipBackground = document.createElementNS(SVG_NS, 'rect');
            this.tooltipBackground.setAttribute('class', 'mtplot-tooltip-bg');
            this.tooltipBackground.setAttribute('rx', '4');
            this.tooltipBackground.setAttribute('ry', '4');
            this.tooltipBackground.setAttribute('fill', 'white');
            this.tooltipBackground.setAttribute('stroke', '#ccc');
            this.tooltipBackground.style.display = 'none';
            this.tooltip = document.createElementNS(SVG_NS, 'text');
            this.tooltip.setAttribute('class', 'mtplot-tooltip');
            this.tooltip.style.display = 'none';
            this.svg.appendChild(this.tooltipBackground);
            this.svg.appendChild(this.tooltip);
            this.setupSVG(container, width, height);
            // Setup pan and zoom handling
            this.setupInteraction();
        }
        setupSVG(container, width, height) {
            const attributes = [
                ['version', '1.1'],
                ['viewBox', `0 0 ${width} ${height}`],
                ['preserveAspectRatio', 'none'],
                ['style', 'width: 100%; height: 100%;']
            ];
            attributes.forEach(([name, value]) => {
                this.svg.setAttribute(name, value);
            });
            container.appendChild(this.svg);
        }
        setupInteraction() {
            let isPanning = false;
            let startX = 0;
            let startY = 0;
            let currentTransform = { x: 0, y: 0, scale: 1 };
            this.svg.addEventListener('mousedown', (e) => {
                isPanning = true;
                startX = e.clientX;
                startY = e.clientY;
            });
            this.svg.addEventListener('mousemove', (e) => {
                if (!isPanning)
                    return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                currentTransform.x += dx;
                currentTransform.y += dy;
                startX = e.clientX;
                startY = e.clientY;
                this.updateTransform(currentTransform);
            });
            this.svg.addEventListener('mouseup', () => {
                isPanning = false;
            });
            this.svg.addEventListener('wheel', (e) => {
                e.preventDefault();
                const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
                currentTransform.scale *= scaleFactor;
                this.updateTransform(currentTransform);
            });
        }
        updateTransform(transform) {
            this.mainGroup.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.scale})`);
        }
        resize(width, height) {
            this.width = width;
            this.height = height;
            this.svg.setAttribute('width', width.toString());
            this.svg.setAttribute('height', height.toString());
            this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
        clear() {
            while (this.mainGroup.firstChild) {
                this.mainGroup.removeChild(this.mainGroup.firstChild);
            }
        }
        drawBar(x, y, width, height, color, options = {}) {
            const rect = document.createElementNS(SVG_NS, 'rect');
            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', width.toString());
            rect.setAttribute('height', height.toString());
            if (options.highContrast) {
                rect.setAttribute('fill', this.getHighContrastColor(color));
                rect.setAttribute('stroke', 'black');
                rect.setAttribute('stroke-width', '2');
            }
            else {
                rect.setAttribute('fill', color);
            }
            if (options.interactive) {
                rect.setAttribute('data-tooltip', options.tooltip || '');
                rect.style.cursor = 'pointer';
                this.setupBarInteraction(rect);
            }
            this.mainGroup.appendChild(rect);
        }
        getHighContrastColor(color) {
            // Convert to high contrast version of the color
            const rgb = this.hexToRgb(color);
            if (!rgb)
                return color;
            const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#FFFFFF';
        }
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        setupBarInteraction(element) {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = element.getAttribute('data-tooltip');
                if (tooltip) {
                    this.showTooltip(tooltip, e.clientX, e.clientY);
                }
            });
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        }
        showTooltip(text, x, y) {
            // Join text lines with a space
            const combinedText = text.split('\n').join(' ');
            // Clear previous tooltip content
            while (this.tooltip.firstChild) {
                this.tooltip.removeChild(this.tooltip.firstChild);
            }
            // Add single tspan element with combined text
            const tspan = document.createElementNS(SVG_NS, 'tspan');
            tspan.textContent = combinedText;
            tspan.setAttribute('x', '0');
            this.tooltip.appendChild(tspan);
            // Calculate tooltip dimensions
            const bbox = this.tooltip.getBBox();
            const padding = 8;
            const tooltipWidth = bbox.width + 2 * padding;
            const tooltipHeight = bbox.height + 2 * padding;
            // Position the text vertically centered with padding
            tspan.setAttribute('y', (padding + bbox.height).toString());
            // Calculate position that keeps tooltip within bounds
            let tooltipX = x + 10; // Default offset from cursor
            let tooltipY = y - tooltipHeight - 10; // Default position above cursor
            // Adjust horizontal position if tooltip would go outside right edge
            if (tooltipX + tooltipWidth > this.width) {
                tooltipX = x - tooltipWidth - 10; // Place tooltip to the left of cursor
            }
            // Adjust vertical position if tooltip would go outside top edge
            if (tooltipY < 0) {
                tooltipY = y + 20; // Place tooltip below cursor
            }
            // Ensure tooltip doesn't go outside left or bottom edges
            tooltipX = Math.max(5, Math.min(this.width - tooltipWidth - 5, tooltipX));
            tooltipY = Math.max(5, Math.min(this.height - tooltipHeight - 5, tooltipY));
            // Position the tooltip and background
            this.tooltip.setAttribute('transform', `translate(${tooltipX}, ${tooltipY})`);
            this.tooltipBackground.setAttribute('x', tooltipX.toString());
            this.tooltipBackground.setAttribute('y', tooltipY.toString());
            this.tooltipBackground.setAttribute('width', tooltipWidth.toString());
            this.tooltipBackground.setAttribute('height', tooltipHeight.toString());
            // Show the tooltip
            this.tooltipBackground.style.display = '';
            this.tooltip.style.display = '';
        }
        hideTooltip() {
            this.tooltipBackground.style.display = 'none';
            this.tooltip.style.display = 'none';
        }
        drawPattern(x, y, width, height, color, patternType) {
            const pattern = document.createElementNS(SVG_NS, 'rect');
            pattern.setAttribute('x', x.toString());
            pattern.setAttribute('y', y.toString());
            pattern.setAttribute('width', width.toString());
            pattern.setAttribute('height', height.toString());
            pattern.setAttribute('fill', color);
            pattern.setAttribute('fill-opacity', '0.3');
            // Add pattern-specific styling
            if (patternType) {
                switch (patternType) {
                    case 'lowValue':
                        pattern.setAttribute('stroke', 'red');
                        pattern.setAttribute('stroke-dasharray', '4,4');
                        break;
                    case 'stagnation':
                        pattern.setAttribute('stroke', 'orange');
                        pattern.setAttribute('stroke-width', '2');
                        break;
                }
            }
            this.mainGroup.appendChild(pattern);
        }
        drawText(x, y, text, options = {}) {
            const textElem = document.createElementNS(SVG_NS, 'text');
            const attrs = [
                ['x', x.toString()],
                ['y', y.toString()],
                ['fill', options.color || 'black'],
                ['font-family', options.fontFamily || 'monospace'],
                ['font-size', (options.fontSize || 12).toString()]
            ];
            if (options.stroke) {
                attrs.push(['stroke', options.stroke]);
                attrs.push(['stroke-width', (options.strokeWidth || 1).toString()]);
            }
            attrs.forEach(([name, value]) => textElem.setAttribute(name, value));
            textElem.textContent = text;
            this.mainGroup.appendChild(textElem);
        }
        getSVGElement() {
            return this.svg;
        }
    }

    class LowValueDetector {
        constructor(options) {
            this.threshold = options.threshold;
            this.consecutiveDays = options.consecutiveDays;
        }
        findPatterns(data) {
            if (data.length < this.consecutiveDays)
                return [];
            const patterns = [];
            const valueRange = this.calculateValueRange(data);
            const lowThreshold = Math.min(...data.map(d => d.y)) + (valueRange * this.threshold);
            let currentSequence = [];
            data.forEach((point, index) => {
                if (point.y <= lowThreshold) {
                    currentSequence.push(index);
                }
                else {
                    if (this.isValidSequence(currentSequence, data)) {
                        patterns.push({
                            start: currentSequence[0],
                            end: currentSequence[currentSequence.length - 1]
                        });
                    }
                    currentSequence = [];
                }
            });
            // Check last sequence
            if (this.isValidSequence(currentSequence, data)) {
                patterns.push({
                    start: currentSequence[0],
                    end: currentSequence[currentSequence.length - 1]
                });
            }
            return patterns;
        }
        calculateValueRange(data) {
            const values = data.map(d => d.y);
            return Math.max(...values) - Math.min(...values);
        }
        isValidSequence(sequence, data) {
            if (sequence.length < this.consecutiveDays)
                return false;
            // Check if points are consecutive days
            for (let i = 1; i < sequence.length; i++) {
                const daysDiff = (data[sequence[i]].x.valueOf() - data[sequence[i - 1]].x.valueOf()) / (24 * 60 * 60 * 1000);
                if (daysDiff > 1.1)
                    return false; // Allow small tolerance
            }
            return true;
        }
    }

    class StagnationDetector {
        constructor(options) {
            this.consecutiveDays = options.consecutiveDays;
            this.changeThreshold = options.changeThreshold;
            this.activeChangePercentage = options.activeChangePercentage;
        }
        findPatterns(data) {
            if (data.length < this.consecutiveDays)
                return [];
            const patterns = [];
            const avgDailyChange = this.calculateAverageChange(data);
            if (!this.hasEnoughActiveChanges(data, avgDailyChange)) {
                return [];
            }
            let currentSequence = [];
            const significantChangeThreshold = avgDailyChange * this.changeThreshold;
            data.forEach((point, index) => {
                currentSequence.push(index);
                if (index === data.length - 1 ||
                    Math.abs(data[index + 1].y - point.y) > significantChangeThreshold) {
                    if (this.isStagnationPeriod(currentSequence, data, significantChangeThreshold)) {
                        patterns.push({
                            start: currentSequence[0],
                            end: currentSequence[currentSequence.length - 1]
                        });
                    }
                    currentSequence = [];
                }
            });
            return patterns;
        }
        calculateAverageChange(data) {
            if (data.length < 2)
                return 0;
            let totalChange = 0;
            let changes = 0;
            for (let i = 1; i < data.length; i++) {
                const change = Math.abs(data[i].y - data[i - 1].y);
                if (change > 0) {
                    totalChange += change;
                    changes++;
                }
            }
            return changes > 0 ? totalChange / changes : 0;
        }
        hasEnoughActiveChanges(data, avgDailyChange) {
            if (data.length < 2)
                return false;
            let significantChanges = 0;
            const significantChangeThreshold = avgDailyChange * this.changeThreshold;
            for (let i = 1; i < data.length; i++) {
                const change = Math.abs(data[i].y - data[i - 1].y);
                if (change > significantChangeThreshold) {
                    significantChanges++;
                }
            }
            return (significantChanges / (data.length - 1)) >= this.activeChangePercentage;
        }
        isStagnationPeriod(sequence, data, significantChangeThreshold) {
            if (sequence.length < this.consecutiveDays)
                return false;
            // Check if points are consecutive days
            for (let i = 1; i < sequence.length; i++) {
                const daysDiff = (data[sequence[i]].x.valueOf() - data[sequence[i - 1]].x.valueOf()) / (24 * 60 * 60 * 1000);
                if (daysDiff > 1.1)
                    return false;
            }
            // Check if changes are below threshold
            for (let i = 1; i < sequence.length; i++) {
                const change = Math.abs(data[sequence[i]].y - data[sequence[i - 1]].y);
                if (change > significantChangeThreshold)
                    return false;
            }
            return true;
        }
    }

    function calculateMean(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    function calculateMedian(values) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }
    function calculateStandardDeviation(values) {
        if (values.length < 2)
            return 0;
        const mean = calculateMean(values);
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = calculateMean(squaredDiffs);
        return Math.sqrt(variance);
    }
    function calculatePercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        if (percentile < 0 || percentile > 100)
            throw new Error('Percentile must be between 0 and 100');
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        if (lower === upper)
            return sorted[lower];
        const fraction = index - lower;
        return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
    }
    function calculateMovingAverage(values, window) {
        if (window < 1 || window > values.length)
            return values;
        const result = [];
        for (let i = 0; i < values.length - window + 1; i++) {
            const windowValues = values.slice(i, i + window);
            result.push(calculateMean(windowValues));
        }
        return result;
    }

    function formatDate(date) {
        return date.toISOString();
    }
    function getDateRange(dates) {
        return {
            min: new Date(Math.min(...dates.map(d => d.valueOf()))),
            max: new Date(Math.max(...dates.map(d => d.valueOf())))
        };
    }

    const DEFAULT_THEME = {
        barColor: 'black',
        barHoverColor: 'blue',
        lowValueColor: 'rgba(255,0,0,0.2)',
        stagnationColor: 'rgba(255,165,0,0.2)',
        backgroundColor: 'white',
        textColor: 'black',
        fontFamily: 'monospace',
        fontSize: 12
    };
    const DEFAULT_OPTIONS = {
        width: 800,
        height: 400,
        theme: DEFAULT_THEME,
        patterns: {
            lowValue: {
                threshold: 0.02,
                consecutiveDays: 2
            },
            stagnation: {
                consecutiveDays: 3,
                changeThreshold: 0.2,
                activeChangePercentage: 0.85
            }
        },
        responsive: true,
        accessibility: {
            enableKeyboardNavigation: true,
            enableScreenReader: true,
            highContrast: false,
            ariaLabel: 'Time series chart'
        },
        interaction: {
            enableZoom: true,
            enablePan: true,
            tooltipFormat: (point) => `${formatDate(point.x)}: ${point.y}`,
            onPointClick: undefined
        },
        performance: {
            enableVirtualization: true,
            clusteringThreshold: 1000,
            useWebWorker: true
        }
    };
    class MTPlot {
        constructor(containerId, initialData = [], options = {}) {
            var _a, _b;
            this.isDirty = false;
            this.updateTimeout = null;
            this.refreshDelay = 100;
            this.resizeObserver = null;
            this.tooltip = null;
            this.worker = null;
            this.zoom = {
                scale: 1,
                offset: { x: 0, y: 0 }
            };
            const container = document.getElementById(containerId);
            if (!container)
                throw new Error(`No element found with id: ${containerId}`);
            this.container = container;
            this.options = { ...DEFAULT_OPTIONS, ...options };
            // Initialize tooltip
            this.setupTooltip();
            // Initialize WebWorker if enabled
            if ((_a = this.options.performance) === null || _a === undefined ? undefined : _a.useWebWorker) {
                this.setupWebWorker();
            }
            // Initialize renderer with responsive support
            this.renderer = new SVGRenderer(container, this.getWidth(), this.getHeight());
            // Set up accessibility
            if ((_b = this.options.accessibility) === null || _b === undefined ? undefined : _b.enableScreenReader) {
                this.setupAccessibility();
            }
            // Initialize data with sorting and clustering if needed
            this.data = this.processInitialData(initialData);
            this.lowValueDetector = new LowValueDetector(this.options.patterns.lowValue);
            this.stagnationDetector = new StagnationDetector(this.options.patterns.stagnation);
            // Set up event listeners
            this.setupEventListeners();
            // Set up responsive handling
            if (this.options.responsive) {
                this.setupResponsive();
            }
            this.update();
        }
        setupTooltip() {
            this.tooltip = document.createElement('div');
            this.tooltip.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ccc;
      padding: 8px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
            document.body.appendChild(this.tooltip);
        }
        setupWebWorker() {
            const workerCode = `
      self.onmessage = function(e) {
        const { data, patterns } = e.data;
        const results = {
          lowValue: findLowValuePatterns(data, patterns.lowValue),
          stagnation: findStagnationPatterns(data, patterns.stagnation)
        };
        self.postMessage(results);
      };
    `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            this.worker.onmessage = (e) => {
                this.handleWorkerResults(e.data);
            };
        }
        setupAccessibility() {
            var _a, _b;
            const svg = this.renderer.getSVGElement();
            svg.setAttribute('role', 'img');
            svg.setAttribute('aria-label', ((_a = this.options.accessibility) === null || _a === undefined ? undefined : _a.ariaLabel) || 'Time series chart');
            if ((_b = this.options.accessibility) === null || _b === undefined ? undefined : _b.enableKeyboardNavigation) {
                svg.setAttribute('tabindex', '0');
                svg.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
            }
        }
        setupResponsive() {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target === this.container) {
                        this.handleResize();
                    }
                }
            });
            this.resizeObserver.observe(this.container);
        }
        getWidth() {
            return this.options.responsive ?
                this.container.clientWidth :
                this.options.width;
        }
        getHeight() {
            return this.options.responsive ?
                this.container.clientHeight :
                this.options.height;
        }
        processInitialData(data) {
            var _a, _b;
            let processedData = [...data].sort((a, b) => a.x.valueOf() - b.x.valueOf());
            if (((_a = this.options.performance) === null || _a === undefined ? undefined : _a.enableVirtualization) &&
                processedData.length > (((_b = this.options.performance) === null || _b === undefined ? undefined : _b.clusteringThreshold) || 1000)) {
                processedData = this.clusterData(processedData);
            }
            return processedData;
        }
        clusterData(data) {
            const clusterSize = Math.floor(data.length / this.getWidth());
            if (clusterSize <= 1)
                return data;
            const clustered = [];
            for (let i = 0; i < data.length; i += clusterSize) {
                const cluster = data.slice(i, i + clusterSize);
                const avgX = new Date(cluster.reduce((sum, p) => sum + p.x.valueOf(), 0) / cluster.length);
                const avgY = cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length;
                clustered.push({ x: avgX, y: avgY });
            }
            return clustered;
        }
        handleResize() {
            this.renderer.resize(this.getWidth(), this.getHeight());
            this.triggerUpdate();
        }
        handleKeyboardNavigation(e) {
            var _a;
            if (!((_a = this.options.accessibility) === null || _a === undefined ? undefined : _a.enableKeyboardNavigation))
                return;
            switch (e.key) {
                case 'ArrowLeft':
                    this.zoom.offset.x -= 10;
                    break;
                case 'ArrowRight':
                    this.zoom.offset.x += 10;
                    break;
                case 'ArrowUp':
                    this.zoom.scale *= 1.1;
                    break;
                case 'ArrowDown':
                    this.zoom.scale /= 1.1;
                    break;
            }
            this.triggerUpdate();
        }
        handleWorkerResults(results) {
            // Handle pattern detection results from worker
            this.drawPatterns(this.calculateValueRange(), this.calculateTimeRange());
        }
        setupEventListeners() {
            // Add mouse move listener for hover effects
            this.container.addEventListener('mousemove', (e) => {
                var _a, _b;
                const rect = this.container.getBoundingClientRect();
                const x = e.clientX - rect.left;
                e.clientY - rect.top;
                // Find the closest data point
                const timeRange = this.calculateTimeRange();
                const hoveredTime = this.getTimeFromX(x, timeRange);
                const closestPoint = this.findClosestPoint(hoveredTime);
                if (closestPoint) {
                    // Format tooltip text with date and value on separate lines
                    const tooltipText = ((_b = (_a = this.options.interaction) === null || _a === undefined ? undefined : _a.tooltipFormat) === null || _b === undefined ? undefined : _b.call(_a, closestPoint)) ||
                        `Date: ${closestPoint.x.toLocaleDateString()}, Value: ${closestPoint.y.toFixed(2)}`;
                    this.renderer.showTooltip(tooltipText, e.clientX, e.clientY);
                }
            });
            this.container.addEventListener('mouseleave', () => {
                this.renderer.hideTooltip();
            });
            // Add resize observer for responsive behavior
            const resizeObserver = new ResizeObserver(() => {
                this.triggerUpdate();
            });
            resizeObserver.observe(this.container);
            // Setup keyboard navigation
            this.container.tabIndex = 0;
            this.container.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        }
        getTimeFromX(x, timeRange) {
            const ratio = x / this.options.width;
            return timeRange.min + (timeRange.max - timeRange.min) * ratio;
        }
        findClosestPoint(timestamp) {
            if (!this.data.length)
                return null;
            let closest = this.data[0];
            let minDiff = Math.abs(closest.x.valueOf() - timestamp);
            for (const point of this.data) {
                const diff = Math.abs(point.x.valueOf() - timestamp);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = point;
                }
            }
            return closest;
        }
        setTheme(theme) {
            this.options.theme = { ...this.options.theme, ...theme };
            this.triggerUpdate();
        }
        setPatternOptions(options) {
            if (options.lowValue) {
                this.lowValueDetector = new LowValueDetector({
                    ...this.options.patterns.lowValue,
                    ...options.lowValue
                });
            }
            if (options.stagnation) {
                this.stagnationDetector = new StagnationDetector({
                    ...this.options.patterns.stagnation,
                    ...options.stagnation
                });
            }
            this.options.patterns = {
                ...this.options.patterns,
                ...options
            };
            this.triggerUpdate();
        }
        addData(point) {
            this.data.push(point);
            this.data.sort((a, b) => a.x.valueOf() - b.x.valueOf());
            this.triggerUpdate();
        }
        removeOldest() {
            if (this.data.length > 0) {
                this.data.shift();
                this.triggerUpdate();
            }
        }
        replaceOldest(point) {
            if (this.data.length > 0) {
                this.data[0] = point;
                this.data.sort((a, b) => a.x.valueOf() - b.x.valueOf());
                this.triggerUpdate();
            }
        }
        triggerUpdate() {
            if (this.updateTimeout) {
                window.clearTimeout(this.updateTimeout);
            }
            this.isDirty = true;
            this.updateTimeout = window.setTimeout(() => {
                this.update();
                this.updateTimeout = null;
            }, this.refreshDelay);
        }
        update() {
            if (!this.isDirty)
                return;
            this.renderer.clear();
            if (this.data.length === 0)
                return;
            const { width, height } = this.options;
            const valueRange = this.calculateValueRange();
            const timeRange = this.calculateTimeRange();
            // Draw patterns first
            this.drawPatterns(valueRange, timeRange);
            // Then draw bars
            this.drawBars(valueRange, timeRange);
            // Draw statistics
            this.drawStatistics(valueRange);
            this.isDirty = false;
        }
        calculateValueRange() {
            const values = this.data.map(d => d.y);
            return {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        }
        calculateTimeRange() {
            return {
                min: this.data[0].x.valueOf(),
                max: this.data[this.data.length - 1].x.valueOf()
            };
        }
        drawPatterns(valueRange, timeRange) {
            // Draw low value patterns
            const lowValuePatterns = this.lowValueDetector.findPatterns(this.data);
            lowValuePatterns.forEach(pattern => {
                const startX = this.getXPosition(this.data[pattern.start].x, timeRange);
                const endX = this.getXPosition(this.data[pattern.end].x, timeRange);
                this.renderer.drawPattern(startX, 0, endX - startX, this.getHeight(), this.options.theme.lowValueColor, 'lowValue');
            });
            // Draw stagnation patterns
            const stagnationPatterns = this.stagnationDetector.findPatterns(this.data);
            stagnationPatterns.forEach(pattern => {
                const startX = this.getXPosition(this.data[pattern.start].x, timeRange);
                const endX = this.getXPosition(this.data[pattern.end].x, timeRange);
                this.renderer.drawPattern(startX, 0, endX - startX, this.getHeight(), this.options.theme.stagnationColor, 'stagnation');
            });
        }
        drawBars(valueRange, timeRange) {
            var _a, _b, _c;
            for (let i = 0; i < this.data.length; i++) {
                const point = this.data[i];
                const nextPoint = this.data[i + 1];
                const x = this.getXPosition(point.x, timeRange);
                const y = this.scaleY(point.y, valueRange);
                const width = nextPoint
                    ? this.getXPosition(nextPoint.x, timeRange) - x
                    : 10;
                const height = this.options.height - y;
                // Format tooltip text with date and value on the same line
                const tooltipText = ((_b = (_a = this.options.interaction) === null || _a === undefined ? undefined : _a.tooltipFormat) === null || _b === undefined ? undefined : _b.call(_a, point)) ||
                    `Date: ${point.x.toLocaleDateString()}, Value: ${point.y.toFixed(2)}`;
                this.renderer.drawBar(x, y, width, height, this.options.theme.barColor, {
                    interactive: true,
                    tooltip: tooltipText,
                    highContrast: (_c = this.options.accessibility) === null || _c === undefined ? undefined : _c.highContrast
                });
            }
        }
        drawStatistics(valueRange) {
            const values = this.data.map(d => d.y);
            const mean = calculateMean(values);
            const median = calculateMedian(values);
            // Draw mean line
            this.renderer.drawPattern(0, this.scaleY(mean, valueRange), this.options.width, 1, 'rgba(0,0,255,0.5)');
            // Draw median line
            this.renderer.drawPattern(0, this.scaleY(median, valueRange), this.options.width, 1, 'rgba(0,255,0,0.5)');
        }
        getXPosition(x, range) {
            return ((x.valueOf() - range.min) / (range.max - range.min)) * this.options.width;
        }
        scaleY(y, range) {
            return this.options.height - ((y - range.min) / (range.max - range.min)) * this.options.height;
        }
        // Public API methods for statistics
        getStatistics() {
            const values = this.data.map(d => d.y);
            return {
                mean: calculateMean(values),
                median: calculateMedian(values),
                movingAverage: calculateMovingAverage(values, 5)
            };
        }
        // Export methods
        exportToCSV() {
            const headers = ['Date', 'Value'];
            const rows = this.data.map(point => [
                point.x.toISOString(),
                point.y.toString()
            ]);
            return [headers, ...rows]
                .map(row => row.join(','))
                .join('\n');
        }
        exportToSVG() {
            return this.renderer.getSVGElement().outerHTML;
        }
    }

    exports.MTPlot = MTPlot;
    exports.calculateMean = calculateMean;
    exports.calculateMedian = calculateMedian;
    exports.calculateMovingAverage = calculateMovingAverage;
    exports.calculatePercentile = calculatePercentile;
    exports.calculateStandardDeviation = calculateStandardDeviation;
    exports.formatDate = formatDate;
    exports.getDateRange = getDateRange;

}));
//# sourceMappingURL=mtplot.js.map
