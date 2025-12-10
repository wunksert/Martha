import { useSyncExternalStore } from 'react';
import { Product } from './components/ProductCard';

// Event type constant
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

// Type definitions for window.openai
type UnknownObject = Record<string, unknown>;

type DisplayMode = "pip" | "inline" | "fullscreen";
type Theme = "light" | "dark";

type OpenAiGlobals<
  ToolInput extends UnknownObject = UnknownObject,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject
> = {
  theme: Theme;
  userAgent: {
    device: { type: "mobile" | "tablet" | "desktop" | "unknown" };
    capabilities: {
      hover: boolean;
      touch: boolean;
    };
  };
  locale: string;
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: {
    insets: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  view: unknown;
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

type CallToolResponse = {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
};

type API<WidgetState extends UnknownObject = UnknownObject> = {
  /** Calls a tool on your MCP. Returns the full response. */
  callTool: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<CallToolResponse>;

  /** Ask the host to close the widget container */
  requestClose: () => void;

  /** Triggers a followup turn in the ChatGPT conversation */
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

  /** Opens an external link, redirects web page or mobile app */
  openExternal: (payload: { href: string }) => void;

  /** For transitioning an app from inline to fullscreen or pip */
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    /**
     * The granted display mode. The host may reject the request.
     * For mobile, PiP is always coerced to fullscreen.
     */
    mode: DisplayMode;
  }>;

  /** Spawn a modal owned by ChatGPT */
  requestModal: (args: unknown) => Promise<unknown>;

  /** Report dynamic widget heights to avoid scroll clipping */
  notifyIntrinsicHeight: (height: number) => void;

  setWidgetState: (state: WidgetState) => Promise<void>;
};

// Custom event type for set_globals
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

// Extend Window interface
declare global {
  interface Window {
    openai?: API & OpenAiGlobals<{
      products?: Product[];
    }, {
      products?: Product[];
    }>;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

/**
 * Hook to subscribe to a single global value from window.openai.
 * Listens for host openai:set_globals events and lets React components
 * subscribe to a single global value.
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => {
      // Ensure window.openai exists and has the key
      if (!window.openai) {
        return null as OpenAiGlobals[K];
      }
      // Type guard to ensure we're accessing globals, not API methods
      const value = (window.openai as any)[key];
      return value ?? null;
    }
  ) as OpenAiGlobals[K];
}

/**
 * Convenience hook to read toolOutput from window.openai
 */
export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}

export function useToolInput() {
    return useOpenAiGlobal("toolInput");
}

