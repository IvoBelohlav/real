'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface TutorialContextType {
  isTutorialRunning: boolean;
  startTutorial: () => void;
  endTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTutorialRunning, setIsTutorialRunning] = useState(false);

  const startTutorial = useCallback(() => {
    // Clear the completion flag before starting manually
    localStorage.removeItem('dashboardTourCompleted');
    setIsTutorialRunning(true);
    console.log('TutorialContext: Starting tutorial manually.');
  }, []);

  const endTutorial = useCallback(() => {
    setIsTutorialRunning(false);
    // Mark as completed in localStorage when finished/skipped
    localStorage.setItem('dashboardTourCompleted', 'true');
    console.log('TutorialContext: Ending tutorial.');
  }, []);

  return (
    <TutorialContext.Provider value={{ isTutorialRunning, startTutorial, endTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = (): TutorialContextType => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
