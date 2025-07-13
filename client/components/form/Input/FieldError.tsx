import { useFormContext } from "react-hook-form";

function FieldError({ name, className }: { name: string; className?: string }) {
  // the useFormContext hook returns the current state of hook form.
  const {
    formState: { errors },
  } = useFormContext();

  if (!name) return null;

  const error = errors[name];
  if (!error) return null;

  return (
    <span className={`text-red-500 ${className}`}>{error.message as any}</span>
  );
}
export default FieldError;
