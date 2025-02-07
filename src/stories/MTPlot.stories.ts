import type { Meta, StoryObj } from '@storybook/html';
import { MTPlot } from '../MTPlot';

const meta: Meta = {
  title: 'Components/MTPlot',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => {
    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '400px';
    div.id = 'plot';
    
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: new Date(2023, 0, i + 1),
      y: Math.random() * 100,
    }));
    
    new MTPlot('plot', data);
    return div;
  },
};

export const WithPatterns: Story = {
  render: () => {
    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '400px';
    div.id = 'plot-patterns';
    
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: new Date(2023, 0, i + 1),
      y: i < 15 ? Math.random() * 10 : 50 + Math.random() * 10,
    }));
    
    new MTPlot('plot-patterns', data, {
      patterns: {
        lowValue: { threshold: 20, consecutiveDays: 3 },
        stagnation: { consecutiveDays: 5, changeThreshold: 0.1, activeChangePercentage: 0.05 }
      }
    });
    return div;
  },
};

export const HighContrast: Story = {
  render: () => {
    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '400px';
    div.id = 'plot-contrast';
    
    const data = Array.from({ length: 30 }, (_, i) => ({
      x: new Date(2023, 0, i + 1),
      y: Math.random() * 100,
    }));
    
    new MTPlot('plot-contrast', data, {
      accessibility: {
        highContrast: true,
        enableScreenReader: true
      }
    });
    return div;
  },
};
