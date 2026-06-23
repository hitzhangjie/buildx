/** Mirrors OneDev BooleanPropertyEditor — requires input + span sibling for switch CSS. */
export function BeanSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="switch switch-sm switch-primary">
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span />
      </label>
    </span>
  );
}
