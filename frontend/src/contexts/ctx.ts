import { createContext, useContext} from "react";
import type { WhiteboardContextType } from "./types";

export const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined);

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (context === undefined) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
}; 