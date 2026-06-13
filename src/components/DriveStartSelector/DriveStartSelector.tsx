import {
  DRIVE_START_OPTIONS,
  getDriveStartSelectValue,
  type DriveStartYardLine,
} from '../../types/driveStart'
import './DriveStartSelector.css'

type DriveStartSelectorProps = {
  value: DriveStartYardLine
  onChange: (driveStart: DriveStartYardLine) => void
  disabled?: boolean
  compact?: boolean
}

export function DriveStartSelector({
  value,
  onChange,
  disabled = false,
  compact = false,
}: DriveStartSelectorProps) {
  return (
    <div className={`drive-start-selector ${compact ? 'drive-start-selector-compact' : ''}`}>
      <label htmlFor="drive-start" className={`field-label ${compact ? 'sidebar-field-label' : ''}`}>
        Drive Start Yard Line
      </label>
      <select
        id="drive-start"
        className={`select-field ${compact ? 'sidebar-control' : ''}`}
        value={getDriveStartSelectValue(value)}
        onChange={(e) => onChange(e.target.value as DriveStartYardLine)}
        disabled={disabled}
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
