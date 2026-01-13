import { useEffect, useRef } from "react";

export const useDocumentTitle = (title: string, restoreOnUnmount = true) => {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    document.title = title ? `${title} | VISÃO` : "VISÃO";
  }, [title]);

  useEffect(() => {
    if (restoreOnUnmount) {
      return () => {
        document.title = previousTitle.current;
      };
    }
  }, [restoreOnUnmount]);
};

export default useDocumentTitle;
