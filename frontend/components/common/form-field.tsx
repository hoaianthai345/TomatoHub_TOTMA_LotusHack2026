import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  id?: string;
  className?: string;
  children: ReactNode;
}

interface FormControlProps {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export default function FormField({
  label,
  required = false,
  helper,
  error,
  id,
  className = "",
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const helperId = helper ? `${controlId}-helper` : null;
  const errorId = error ? `${controlId}-error` : null;

  let control = children;
  let labelFor: string | undefined;
  if (isValidElement(children)) {
    const element = children as ReactElement<FormControlProps>;
    const elementType =
      typeof element.type === "string" ? element.type.toLowerCase() : null;
    const isFieldControl =
      elementType === "input" || elementType === "select" || elementType === "textarea";

    if (!isFieldControl) {
      control = element;
    } else {
      labelFor = element.props.id ?? controlId;
      const describedBy = [
        element.props["aria-describedby"],
        helperId,
        errorId,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      control = cloneElement(element, {
        id: labelFor,
        "aria-invalid": error ? true : element.props["aria-invalid"],
        "aria-describedby": describedBy || undefined,
      });
    }
  }

  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      {labelFor ? (
        <label htmlFor={labelFor} className="label-text">
          {label}
          {required ? (
            <span className="label-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : (
        <p className="label-text">
          {label}
          {required ? (
            <span className="label-required" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </p>
      )}
      {control}
      {helper ? (
        <p id={helperId ?? undefined} className="label-helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId ?? undefined} className="label-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
