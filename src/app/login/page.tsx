import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;

  return <LoginForm registered={params.registered === "1"} />;
}
