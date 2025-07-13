/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleIcon } from "@/assets/icons";
import AuthForm from "@/components/auth/AuthForm";
import Form from "@/components/form/Form";
import Input from "@/components/form/Input";
import SeparatorText from "@/components/SeparatorText";
import { Button } from "@/components/ui/button";
import useZodForm from "@/hooks/useZodForm";

import { useStoreAuthActions } from "@/store/userAuthStore";
import { IUser } from "@/types/user";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRegisterUser } from "../api/hooks";
import { SIGN_UP_SCHEMA, SignUpSchemaType } from "../schema";

const SignUpScreen = () => {
  const router = useRouter();
  // useIsAuth(true);
  const form = useZodForm({
    schema: SIGN_UP_SCHEMA,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const setUser = useStoreAuthActions().setUser;
  const { handleRegister } = useRegisterUser();

  const onSubmit = async (e: SignUpSchemaType) => {
    try {
      const result = await handleRegister(e);
      if (result.success) {
        toast.success(result.message);
        setUser({
          user: result.data as IUser,
          isAuthenticated: true,
          isLoggedIn: true,
          isAuthenticating: false,
        });
        return router.replace("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  const SignInWithG = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/google`;
    } catch {}
  };

  return (
    <div className="relative flex w-full  h-screen  justify-center items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/auth-bg.jpg"
        alt="background"
        className="absolute top-0 left-0 w-full h-full object-cover "
      />
      <AuthForm
        title="Begin your journey!"
        description="Create your account to continue."
        className=" relative z-10 opacity-95 dark:opacity-90"
        footer={
          <div className="w-full flex flex-col gap-2 items-center justify-center ">
            <Button
              type="button"
              className="w-full cursor-pointer"
              onClick={form.handleSubmit(onSubmit)}
            >
              Sign up
            </Button>
            <SeparatorText text="OR" className="py-1" />
            <Button
              type="button"
              variant={"outline"}
              className=" w-full gap-2 text-muted-foreground bg-muted-foreground/10 cursor-pointer"
              onClick={SignInWithG}
            >
              <GoogleIcon /> Continue with Google
            </Button>
            <div className="flex  gap-1 text-sm">
              <span className="text-gray-400">Alreay have an account?</span>
              <Link href={"/login"} className="text-blue-400 hover:underline">
                Login
              </Link>
            </div>
          </div>
        }
      >
        <Form form={form} onSubmit={onSubmit} className="space-y-5">
          <Input
            name="name"
            placeholder="Enter name"
            label="Name"
            border="bottom"
            className="border-b-muted-foreground/30"
          />
          <Input
            border="bottom"
            name="email"
            placeholder="Enter email..."
            type="email"
            label="Email"
            className="border-b-muted-foreground/30"
          />
          <Input
            border="bottom"
            name="password"
            placeholder="********"
            type="password"
            label="Password"
            className="border-b-muted-foreground/30"
          />
          <Input
            border="bottom"
            name="confirmPassword"
            placeholder="********"
            type="password"
            label="Confirm Password"
            className="border-b-muted-foreground/30"
          />
        </Form>
      </AuthForm>
    </div>
  );
};

export default SignUpScreen;
