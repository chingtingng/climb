import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

export const Field = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    icon?: boolean;
    /** Cap iOS page scale on focus so Safari does not zoom the search field. */
    preventIosZoom?: boolean;
  }
>(function Field({ className, icon, preventIosZoom, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx("field", icon && "field-icon", className)}
      {...props}
      data-prevent-ios-zoom={preventIosZoom ? "" : undefined}
    />
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx("field", className)} {...props} />;
});
