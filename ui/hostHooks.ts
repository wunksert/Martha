import { useSyncExternalStore, useCallback, useMemo, useState, useEffect } from 'react';

// Event type constant
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

// Type definitions for window.openai
type UnknownObject = Record<string, unknown>;

export type DisplayMode = "pip" | "inline" | "fullscreen";
export type Theme = "light" | "dark";

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
  callTool: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<CallToolResponse>;

  requestClose: () => void;

  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

  openExternal: (payload: { href: string }) => void;

  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    mode: DisplayMode;
  }>;

  requestModal: (args: unknown) => Promise<unknown>;

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
    openai?: API & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

/**
 * Hook to subscribe to a single global value from window.openai.
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] | null {
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
      if (!window.openai) {
        return null;
      }
      const value = (window.openai as any)[key];
      return value ?? null;
    }
  );
}

export function useToolOutput<T = unknown>() {
  const output = useOpenAiGlobal("toolOutput");
  return (output as T) || null;
}

export function useToolInput<T = unknown>() {
    const input = useOpenAiGlobal("toolInput");
    return (input as T) || null;
}

export function useTheme(): Theme {
    const theme = useOpenAiGlobal("theme");
    return (theme as Theme) ?? "dark";
}

export function useWidgetState<T extends UnknownObject>(initialState: T) {
  const hostState = useOpenAiGlobal("widgetState") as T | null;
  const [localState, setLocalState] = useState<T>(initialState);

  useEffect(() => {
    if (hostState) {
      setLocalState((prev) => {
          return { ...prev, ...hostState };
      });
    }
  }, [hostState]);

  const setWidgetState = useCallback(async (newState: Partial<T> | ((prev: T) => Partial<T>)) => {
      setLocalState((prev) => {
          const next = typeof newState === 'function' 
              ? { ...prev, ...newState(prev) }
              : { ...prev, ...newState };
          
          if (window.openai?.setWidgetState) {
              window.openai.setWidgetState(next).catch(console.error);
          }
          return next;
      });
  }, []);

  return [localState, setWidgetState] as const;
}

export function useWidgetProps<T>() {
    return useToolOutput<T>();
}

export function useDisplayMode() {
    return useOpenAiGlobal("displayMode") as DisplayMode ?? "inline";
}

export function useMaxHeight() {
    return useOpenAiGlobal("maxHeight") as number ?? 600;
}

export function useHostAPI() {
    return useMemo(() => {
        if (!window.openai) return null;
        return {
            callTool: window.openai.callTool,
            requestClose: window.openai.requestClose,
            sendFollowUpMessage: window.openai.sendFollowUpMessage,
            openExternal: window.openai.openExternal,
            requestDisplayMode: window.openai.requestDisplayMode,
            requestModal: window.openai.requestModal,
            notifyIntrinsicHeight: window.openai.notifyIntrinsicHeight
        };
    }, []);
}
