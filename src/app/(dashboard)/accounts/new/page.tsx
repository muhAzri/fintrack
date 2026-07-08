import { NewAccountForm } from "./new-account-form";

export default function NewAccountPage() {
  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New account</h1>
      <NewAccountForm />
    </main>
  );
}
