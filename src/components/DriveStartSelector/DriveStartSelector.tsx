import {
  DRIVE_START_OPTIONS,
  type DriveStartYardLine,
} from '../../types/driveStart'
import './DriveStartSelector.css'

type DriveStartSelectorProps = {
  value: DriveStartYardLine
  onChange: (driveStart: DriveStartYardLine) => void
}

export function DriveStartSelector({ value, onChange }: DriveStartSelectorProps) {
  return (
    <div className="drive-start-selector">
      <label htmlFor="drive-start" className="field-label">
        Drive Start Yard Line
      </label>
      <select
        id="drive-start"
        className="select-field"
        value={value}
        onChange={(e) => onChange(e.target.value as DriveStartYardLine)}
      >
        {DRIVE_START_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
