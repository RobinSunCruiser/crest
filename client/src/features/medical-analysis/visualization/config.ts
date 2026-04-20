// DAG Visualization Configuration
export const DAG_CANVAS_CONFIG = {
  MIN_WIDTH: 600,
  PADDING: 40,
  DEFAULT_WIDTH: 900,
  DEFAULT_HEIGHT: 650,
} as const;

export const DAG_NODE_CONFIG = {
  RADIUS: 28,
  STROKE_WIDTH: 3,
  HOVER_STROKE_WIDTH: 4,
  DRAG_RADIUS_OFFSET: 2,
} as const;

export const DAG_LINK_CONFIG = {
  DISTANCE: 150,
  STROKE_WIDTHS: {
    STRONG: 3,
    MODERATE: 2,
    WEAK: 1,
  },
  HOVER_WIDTH_OFFSET: 2,
} as const;

export const DAG_SIMULATION_CONFIG = {
  CHARGE_STRENGTH: -1200,
  COLLISION_RADIUS: 40,
  LINK_DISTANCE: 150,
  LINK_STRENGTH: 0.8,
  Y_FORCE_STRENGTH: 0.4,
  X_FORCE_STRENGTH: 0.1,
  ALPHA_TARGET: {
    DRAG: 0.3,
    END: 0.01,
  },
} as const;

export const DAG_TOOLTIP_CONFIG = {
  OFFSET: 15,
  MARGIN: 10,
  MAX_WIDTH_RATIO: 0.4,
  PADDING: 12,
  TEXT_WRAP_LENGTH: {
    DESCRIPTION: 60,
    EVIDENCE: 60,
  },
  ANIMATION_DURATION: 200,
} as const;

export const DAG_ZOOM_CONFIG = {
  SCALE_EXTENT: [0.1, 3] as [number, number],
  SCALE_FACTOR: {
    IN: 1.5,
    OUT: 0.67,
  },
  ANIMATION_DURATION: {
    ZOOM: 300,
    RESET: 500,
  },
} as const;



export const DAG_ZOOM_CONTROLS_CONFIG = {
  POSITION: { x: 10, y: 60 },
  BUTTON_SIZE: 30,
  BUTTON_SPACING: 35,
  BORDER_RADIUS: 4,
} as const;

export const DAG_ANIMATIONS = {
  TOOLTIP_FADE: 200,
  HOVER_TRANSITION: 150,
  LINK_HOVER: 200,
  TOOLTIP_SHOW: 200,
  TOOLTIP_HIDE: 150,
} as const;

export const DAG_GRADIENTS = {
  BACKGROUND: {
    id: 'backgroundGradient',
    stops: [
      { offset: '0%', color: '#f8fafc' },
      { offset: '100%', color: '#f1f5f9' },
    ],
  },
} as const;

export const DAG_STYLES = {
  BACKGROUND: {
    fill: 'url(#backgroundGradient)',
    stroke: '#e2e8f0',
    strokeWidth: 2,
  },
  TITLE: {
    fill: '#1e293b',
    fontSize: '18px',
    fontWeight: 'bold',
    textAnchor: 'middle' as const,
  },
  NODE_LABEL: {
    textAnchor: 'middle' as const,
    dy: '0.35em',
    fontSize: '11px',
    fontWeight: 'bold',
    fill: 'white',
    pointerEvents: 'none' as const,
    textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
  },
  TOOLTIP: {
    fill: 'rgba(30, 41, 59, 0.95)',
    stroke: '#ffffff',
    strokeWidth: 2,
    rx: 6,
    fontFamily: 'system-ui, sans-serif',
  },
  ZOOM_CONTROLS: {
    button: {
      fill: '#ffffff',
      stroke: '#d1d5db',
    },
    text: {
      fontSize: '14px',
      fontWeight: 'bold',
      fill: '#374151',
      textAnchor: 'middle' as const,
    },
  },
} as const;