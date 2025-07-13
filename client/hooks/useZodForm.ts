// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm, UseFormProps, UseFormReturn } from "react-hook-form";
// import { z } from "zod";

// /**
//  * A reusable hook that sets up react-hook-form with Zod schema validation.
//  *
//  * @param schema - Zod schema for form validation
//  * @param props - Additional props passed to useForm
//  */
// import { FieldValues } from "react-hook-form";

// export default function useZodForm<
//   TSchema extends z.ZodTypeAny,
//   TFieldValues extends FieldValues = z.infer<TSchema> & FieldValues
// >(
//   props: Omit<UseFormProps<TFieldValues>, "resolver"> & {
//     schema: TSchema;
//   }
// ): UseFormReturn<TFieldValues> {
//   return useForm<TFieldValues>({
//     ...props,
//     resolver: zodResolver(props.schema as z.ZodType<any, any, any>),
//   });
// }

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FieldValues,
  Resolver,
  useForm,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

/**
 * A reusable hook that sets up react-hook-form with Zod schema validation.
 *
 * @param schema - Zod schema for form validation
 * @param props - Additional props passed to useForm
 */
export default function useZodForm<
  TSchema extends z.ZodTypeAny,
  TFieldValues extends FieldValues = z.infer<TSchema> & FieldValues
>(
  props: Omit<UseFormProps<TFieldValues>, "resolver"> & {
    schema: TSchema;
  }
): UseFormReturn<TFieldValues> {
  const { schema, ...rest } = props;

  // Explicitly cast the resolver to match expected type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolver = zodResolver(schema as any) as unknown as Resolver<
    TFieldValues,
    unknown,
    TFieldValues
  >;

  return useForm<TFieldValues>({
    ...rest,
    resolver,
  });
}
