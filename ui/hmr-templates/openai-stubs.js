/**
 * Reusable OpenAI API stubs for local development/testing
 * Sets up window.openai with mock implementations
 */
export function setupOpenAIStubs(mockData, options = {}) {
  const {
    theme = 'dark',
    locale = 'en-US',
    maxHeight = 800,
    displayMode = 'inline',
    userAgent = {
      device: { type: 'desktop' },
      capabilities: { hover: true, touch: false }
    },
    safeArea = {
      insets: { top: 0, bottom: 0, left: 0, right: 0 }
    }
  } = options;

  window.openai = {
    toolOutput: mockData,
    toolInput: {},
    theme,
    locale,
    maxHeight,
    displayMode,
    userAgent,
    safeArea,
    view: null,
    toolResponseMetadata: null,
    widgetState: null,
    // Stub API methods
    callTool: async () => ({ content: [] }),
    requestClose: () => {},
    sendFollowUpMessage: async () => {},
    openExternal: () => {},
    requestDisplayMode: async ({ mode }) => ({ mode }),
    requestModal: async () => ({}),
    notifyIntrinsicHeight: () => {},
    setWidgetState: async () => {}
  };

  return window.openai;
}

