"use client";
import { useEffect, useState } from "react";

const getOnLineStatus = () =>
  typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
    ? navigator.onLine
    : true;

const useIsOnline = (): [boolean, () => void] => {
  const [status, setStatus] = useState(getOnLineStatus());

  const setOnline = () => setStatus(true);
  const setOffline = () => setStatus(false);

  useEffect(() => {
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);

    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);
  const removeNotification = () => {
    setStatus(false);
  };
  return [status, removeNotification];
};

export default useIsOnline;
