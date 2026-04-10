"use client";

type ConfirmActionButtonProps = {
  className?: string;
  label: string;
  message: string;
};

export function ConfirmActionButton({
  className,
  label,
  message
}: ConfirmActionButtonProps) {
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
