import type { InputHTMLAttributes, ReactNode } from "react";

type IconTextInputProps = {
  icon: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function IconTextInput({ icon, ...inputProps }: IconTextInputProps) {
  return (
    <label className="login-label">
      <div className="login-input-shell">
        <span className="login-input-icon" aria-hidden="true">
          {icon}
        </span>
        <input {...inputProps} className="login-input login-input-field" />
      </div>
    </label>
  );
}

