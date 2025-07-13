"use client";
import {
  FieldValues,
  UseControllerProps,
  useFormContext,
} from "react-hook-form";

import { forwardRef, ReactNode, Ref } from "react";
import FieldError from "./FieldError";
import FieldHelperText from "./FieldHelperText";
// import TwInput, { IInputProps } from "./TwInput";
import { MultiSelect, MultiSelectProps } from "@/components/multi-select";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
const IInputVariants = cva(
  "border-transparent rounded-none border-solid border outline-none focus-visible:border-transparent px-0",
  {
    variants: {
      variant: {
        bottom:
          "border-b border-b-input hover:border-b-inputActive focus-visible:border-b-inputActive focus:border-b-inputActive",
        top: "border-t border-t-input hover:border-t-inputActive focus-visible:border-transparent focus-visible:border-t-inputActive  focus:border-t-inputActive",
        right:
          "border-r border-r-input hover:border-r-inputActive focus-visible:border-r-inputActive focus:border-r-inputActive",
        left: "border-l border-l-input hover:border-l-inputActive focus-visible:border-l-inputActive focus:border-l-inputActive",
      },
    },
    // defaultVariants: {
    //   variant: "none",
    // },
  }
);

type InputFormProps = InputProps & {
  label?: ReactNode;
  labelClass?: string;
  helperText?: ReactNode;
  border?: VariantProps<typeof IInputVariants>["variant"];
  options: MultiSelectProps["options"];
  loading?: boolean;
  selectProps?: Omit<MultiSelectProps, "options">;
};
type GenericTextfieldProps<T extends FieldValues> = UseControllerProps<T> &
  InputFormProps;

const FormInput = <T extends FieldValues>(
  props: GenericTextfieldProps<T>,
  ref: Ref<HTMLButtonElement>
) => {
  const {
    name = "",
    label,
    defaultValue,
    helperText,
    placeholder,
    labelClass,
    onChange,
    options = [],
    selectProps,
    loading = false,
    ...rest
  } = props;

  const { control } = useFormContext();

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
            <FormControl>
              <div className="relative ">
                <MultiSelect
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  placeholder={loading ? "loading..." : placeholder}
                  variant="inverted"
                  maxCount={3}
                  options={options}
                  {...selectProps}
                  ref={ref}
                />
              </div>
            </FormControl>
            <FormDescription className="!mt-0 ml-0.5">
              <FieldHelperText helperText={helperText} name={name} />
              <FieldError name={name} className="text-xs" />
            </FormDescription>
          </FormItem>
        );
      }}
    />
  );
};

export default forwardRef(FormInput);
