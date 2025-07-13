import { ReactNode } from "react";

type Props = {
  text: ReactNode;
  className?: string;
};

const SeparatorText = (props: Props) => {
  const { text, className } = props;
  return (
    <div className={`flex items-center gap-4 w-full ${className}`}>
      <hr className="w-full" />
      <p className="text-sm text-muted-foreground text-center">{text}</p>
      <hr className="w-full " />
    </div>
  );
};

export default SeparatorText;
