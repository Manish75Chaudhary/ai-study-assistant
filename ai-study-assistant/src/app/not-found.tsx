import { ErrorState } from "@/components/layout/error-state";

export default function NotFound() {
  return (
    <ErrorState
      title="Page not found"
      description="The page you are looking for does not exist in this phase."
      actionLabel="Back to home"
      actionHref="/"
    />
  );
}
