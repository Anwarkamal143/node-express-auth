"use client";

import { InfoIcon } from "@/assets/icons";
import { useNetworkState } from "react-use";
import Hint from "./hint";

const NetWorkStatus = () => {
  const { online = true } = useNetworkState();

  if (!online) {
    return (
      <div className="p-2 bg-background  flex justify-center items-center text-foreground overflow-hidden">
        <div className="flex flex-col flex-1">
          <span className="flex-1 flex items-center justify-center">
            Connect to the internet
            <Hint label="Check your internet connection">
              <InfoIcon className="size-4 ml-2" />
            </Hint>
          </span>
          <p className="text-muted-foreground text-xs text-center">
            You&apos;re offline. Check your connection.
          </p>
        </div>
        {/* <Hint label="Close">
            <CrossIcon className="size-4 -rotate-45" onClick={setStatus} />
          </Hint> */}
      </div>
    );
  }
  return null;
};

export default NetWorkStatus;
