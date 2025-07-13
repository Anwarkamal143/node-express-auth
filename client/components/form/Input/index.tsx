/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  FieldValues,
  UseControllerProps,
  useFormContext,
} from "react-hook-form";

import {
  cloneElement,
  ElementType,
  isValidElement,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";
import FieldError from "./FieldError";
import FieldHelperText from "./FieldHelperText";
// import TwInput, { IInputProps } from "./TwInput";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
const IInputVariants = cva(
  "border-transparent rounded-none border-solid border outline-none focus-visible:border-transparent px-0",
  {
    variants: {
      variant: {
        bottom:
          "border-b border-b-input hover:border-b-inputActive focus-visible:border-b-inputActive focus:border-b-inputActive dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-b-ring",
        top: "border-t border-t-input hover:border-t-inputActive focus-visible:border-transparent focus-visible:border-t-inputActive  focus:border-t-inputActive dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-t-ring",
        right:
          "border-r border-r-input hover:border-r-inputActive focus-visible:border-r-inputActive focus:border-r-inputActive dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-r-ring",
        left: "border-l border-l-input hover:border-l-inputActive focus-visible:border-l-inputActive focus:border-l-inputActive dark:bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-l-ring",
      },
    },
    // defaultVariants: {
    //   variant: "none",
    // },
  }
);
type IConRenderProps = {
  className?: string;
  onClick: (e: MouseEvent | TouchEvent) => void;
};
type ICommon = {
  className?: string;
  onClick?: (
    e: MouseEvent | TouchEvent,
    { value, name }: { value: any; name: string }
  ) => void;
  meta?: Record<string, any>;
};
type IconProps = ICommon &
  (
    | {
        render: (props: IConRenderProps) => ReactNode;
        Icon?: never;
      }
    | {
        render?: never;
        Icon: ElementType | ReactElement;
      }
  );
type InputFormProps = InputProps & {
  label?: ReactNode;
  labelClass?: string;
  helperText?: ReactNode;
  leftIcon?: IconProps;
  rightIcon?: IconProps;
  border?: VariantProps<typeof IInputVariants>["variant"];
  ref?: React.RefObject<any>;
};
type GenericTextfieldProps<T extends FieldValues> = UseControllerProps<T> &
  InputFormProps;

const ICON_COMMON_CLASSES = (extra: string) =>
  "h-[45%] absolute top-[50%]  translate-y-[-50%] pointer-events-none " + extra;
const FormInput = <T extends FieldValues>(props: GenericTextfieldProps<T>) => {
  const {
    name = "",
    label,
    defaultValue,
    disabled = false,
    helperText,
    rightIcon,
    leftIcon,
    placeholder,
    labelClass,
    type = "text",
    border,
    onChange,
    ...rest
  } = props;

  const { control, getValues } = useFormContext();

  const isIconExist = (Icon?: IconProps) => {
    if (!Icon || (!Icon.Icon && !Icon.render)) {
      return false;
    }
    return true;
  };

  const getIcon = (iconSettings?: IconProps, iconCommonClasses?: string) => {
    const {
      render,
      Icon,
      meta: iconMeta,
      onClick,
      className: iconClasses,
    } = iconSettings || {};
    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (onClick) {
        onClick(event, { value: getValues(name), name });
      }
    };
    const pointerClasses = onClick
      ? " pointer-events-auto cursor-pointer "
      : "";
    if (render) {
      return render({
        className: cn(iconCommonClasses, pointerClasses, iconClasses),
        onClick: handleClick,
        ...iconMeta,
      });
    }
    if (Icon) {
      if (typeof Icon === "string") {
        return <Icon className={cn(iconCommonClasses, iconClasses)} />;
      }
      if (isValidElement(Icon)) {
        return cloneElement(Icon as ReactElement<ICommon>, {
          className: cn(iconCommonClasses, pointerClasses, iconClasses),
          onClick: handleClick,
          ...iconMeta,
        });
      }
      // If Icon is a component (ElementType)
      const IconComponent = Icon;
      return (
        <IconComponent
          className={cn(iconCommonClasses, pointerClasses, iconClasses)}
          onClick={handleClick}
          {...iconMeta}
        />
      );
    }
    return null;
  };
  return (
    <FormField
      defaultValue={defaultValue}
      control={control}
      name={name}
      // disabled={disabled}
      render={({ field }) => {
        if (onChange) {
          field.onChange = onChange;
        }
        return (
          <FormItem className="space-y-1 ">
            {label ? (
              <FormLabel className={cn("text-normal", labelClass)}>
                {label}
              </FormLabel>
            ) : null}
            <FormControl ref={props.ref}>
              <div className="relative ">
                {getIcon(leftIcon, ICON_COMMON_CLASSES("left-2"))}
                {getIcon(rightIcon, ICON_COMMON_CLASSES("right-2"))}
                <Input
                  disabled={disabled}
                  className={cn(
                    border &&
                      IInputVariants({
                        variant: border,
                      }),
                    rest.className,
                    {
                      "pl-8": isIconExist(leftIcon),
                      "pr-8": isIconExist(rightIcon),
                    }
                  )}
                  // {...rest}
                  type={type}
                  placeholder={placeholder}
                  {...field}
                  // onChange={onChange}
                />
              </div>
            </FormControl>
            <FormDescription className="!mt-0 ml-0.5">
              <FieldHelperText helperText={helperText} name={name} />
              <FieldError name={name} className="text" />
            </FormDescription>
          </FormItem>
        );
      }}
    />
  );
};

export default FormInput;
