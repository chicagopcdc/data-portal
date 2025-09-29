import { useState, useCallback } from 'react';
import { checkUserAgreement, handleUserAgreement } from '../ExplorerSurvivalAnalysis/utils';

export function useUserAgreement() {
  const [isCompliant, setIsCompliant] = useState(checkUserAgreement());
  const agree = useCallback(() => {
    handleUserAgreement();
    setIsCompliant(checkUserAgreement());
  }, []);
  return { isCompliant, agree };
}