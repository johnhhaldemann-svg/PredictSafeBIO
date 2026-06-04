import { AlertTriangle } from "lucide-react";

/**
 * DataLoadError — shown when a list fetch fails, so users can tell a real
 * "couldn't load" from an empty "no records yet" state. Previously both looked
 * identical because failed fetches silently fell back to an empty array.
 */
export function DataLoadError({ resource }: { resource: string }) {
  return (
    <div className="data-load-error" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>Couldn&apos;t load {resource}.</strong>
        <p>
          This is usually a temporary connection issue — refresh the page to try again. Your data is
          safe; nothing was changed.
        </p>
      </div>
    </div>
  );
}
