import { FIELDS, LABEL_CLASS } from "./constants";
import { UnderlineButton } from "./UnderlineButton";
import { maskValue } from "./utils";

// Steps already answered, each with a way back to change it. Rows share one
// grid (subgrid), so the label column is as wide as the widest label and the
// values line up row to row; labels match the live field's.
export function DoneList({ fields, values, onChange }) {
  if (!fields.length) return null;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-[1.5vw] max-md:gap-x-4">
      {fields.map((field, index) => (
        <div
          key={field}
          data-done-item
          className="col-span-full mb-[1vw] grid grid-cols-subgrid items-baseline border-b border-white/10 pb-[0.8vw] max-md:mb-4 max-md:pb-3"
        >
          <span className={`${LABEL_CLASS} text-white/40`}>{FIELDS[field].label}</span>
          <span className="text18 truncate text-white">{field === "code" ? "Verified" : maskValue(field, values[field])}</span>
          {field === "code" ? (
            <span aria-hidden="true" />
          ) : (
            <UnderlineButton onClick={() => onChange(index)} className="text-sm">
              Change
            </UnderlineButton>
          )}
        </div>
      ))}
    </div>
  );
}
