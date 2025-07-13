import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type Props = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

const AuthForm = (props: Props) => {
  const { title, description, children, className, footer } = props;
  const isHeaderExist = !!title || !!description;
  return (
    <Card className={cn("max-w-2xl w-full relative", className)}>
      <img
        src="/img/logo.png"
        alt="background"
        className="mx-auto w-1/2 h-52"
      />

      {isHeaderExist ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="space-y-2">{children}</CardContent>
      {footer ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
};

export default AuthForm;
