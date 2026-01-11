import { useEffect, useRef } from "react";
import { safeExecute } from '@/lib/safeExecute';

export const useDocumentTitle = (title: string, restoreOnUnmount = true) => {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    try {
    document.title = title ? `${title} | VISÃO` : "VISÃO";
  }, [title]);

  useEffect(() => {
    try {
    if (restoreOnUnmount) {
      return () => {
        document.title = previousTitle.current;
      };
    }
  }, [restoreOnUnmount]);
};

export default useDocumentTitle;
