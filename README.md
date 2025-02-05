# MTPlot

A minimalistic yet powerful time series plotting library with pattern detection capabilities.

## Features

- **Simple Time Series Visualization**
  - Bar chart visualization with time on X-axis and values on Y-axis
  - Responsive and resizable
  - Customizable colors and styling
  - Mouse-over tooltips showing exact values

- **Pattern Detection**
  - Low Value Detection: Identifies periods where values remain consistently low
  - Stagnation Detection: Identifies periods of minimal change in typically active data
  - Visual indicators for detected patterns
  - Configurable thresholds and parameters

- **Statistical Analysis**
  - Mean and median lines
  - Moving averages
  - Standard deviation calculation
  - Percentile calculations

- **Export Options**
  - Export data to CSV
  - Export chart as SVG
  - Programmatic access to statistics

- **Accessibility**
  - Keyboard navigation support
  - ARIA attributes
  - Screen reader friendly

## Installation

```bash
npm install mtplot
```

## Quick Start

```javascript
import { MTPlot } from 'mtplot';

// Create a new plot
const plot = new MTPlot('container-id', data, {
    width: 1000,
    height: 300
});

// Configure pattern detection
plot.setPatternOptions({
    lowValue: {
        threshold: 0.02,        // 2% of value range
        consecutiveDays: 2      // 2 consecutive days
    },
    stagnation: {
        consecutiveDays: 3,           // 3 consecutive days
        changeThreshold: 0.2,         // 20% of average change
        activeChangePercentage: 0.85  // 85% of days should show change
    }
});

// Customize appearance
plot.setTheme({
    barColor: 'black',
    barHoverColor: 'blue',
    lowValueColor: 'rgba(255,0,0,0.2)',
    stagnationColor: 'rgba(255,165,0,0.2)'
});
```

## API Reference

### Constructor

```javascript
new MTPlot(containerId: string, data?: DataPoint[], options?: PlotOptions)
```

### Data Point Format

```typescript
interface DataPoint {
    x: Date;    // Date object for the time
    y: number;  // Value for that time
}
```

### Configuration Options

```typescript
interface PlotOptions {
    width?: number;
    height?: number;
    theme?: Theme;
    patterns?: {
        lowValue?: {
            threshold: number;
            consecutiveDays: number;
        };
        stagnation?: {
            consecutiveDays: number;
            changeThreshold: number;
            activeChangePercentage: number;
        };
    };
}
```

### Methods

- `addData(point: DataPoint)`: Add a new data point
- `removeOldest()`: Remove the oldest data point
- `replaceOldest(point: DataPoint)`: Replace the oldest point with a new one
- `setTheme(theme: Theme)`: Update the visual theme
- `setPatternOptions(options: PatternOptions)`: Update pattern detection settings
- `getStatistics()`: Get statistical information about the data
- `exportToCSV()`: Export data as CSV
- `exportToSVG()`: Export chart as SVG

## Examples

See the `demo/` directory for complete examples and usage patterns.

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Start demo server
npm start
```

## License

MIT License - see LICENSE file for details
