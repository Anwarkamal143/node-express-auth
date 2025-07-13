"use client";

import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProps,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type IHintProps = TooltipProps & {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

const Hint = (props: IHintProps) => {
  const { label, children, side, align, ...rest } = props;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={50} {...rest}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="bg-black text-white border border-white/5"
        >
          <p className="font-medium text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default Hint;
