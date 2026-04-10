"use client";

type ConfirmDeleteButtonProps = {
  className?: string;
  label: string;
  message: string;
};

export function ConfirmDeleteButton({
  className,
  label,
  message
}: ConfirmDeleteButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
