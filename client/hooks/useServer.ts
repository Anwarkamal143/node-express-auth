"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";

const useServer = (): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const [isServer, setIsServer] = useState(typeof window === undefined);

  useEffect(() => {
    if (isServer) {
      setIsServer(false);
    }
    return () => {};
  }, []);

  return [isServer, setIsServer];
};

export default useServer;
