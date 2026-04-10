import React from 'react';
import ShiftTimeWarning from './ShiftTimeWarning';
import { cn } from '@/lib/utils';
import { validateShiftTime } from '@/lib/timeUtils';

/**
 * Wrapper component that adds shift-time deviation feedback to any input field.
 * - Applies orange border styling when deviation exceeds tolerance
 * - Renders ShiftTimeWarning below the input
 *
 * Usage:
 *   <ShiftTimeFieldWrapper enteredStartTime="08:15" shiftStartTime="08:00">
 *     <Input value={...} onChange={...} />
 *   </ShiftTimeFieldWrapper>
 */
export default function ShiftTimeFieldWrapper({
  enteredStartTime,
  shiftStartTime,
  tolerance = 1,
  children,
  messageFormatter
}) {
  // Guard against non-React elements
  if (!React.isValidElement(children)) {
    return children;
  }

  const { isWarning, diff, normalizedEntered, normalizedShift } = validateShiftTime({
    enteredStartTime,
    shiftStartTime,
    tolerance
  });

  // Clone the child input and inject warning styling
  const childWithProps = React.cloneElement(children, {
    className: cn(
      children.props.className || '',
      isWarning && "border-orange-400 focus:border-orange-400 focus:ring-orange-400"
    )
  });

  return (
    <div>
      {childWithProps}

      <ShiftTimeWarning
        enteredStartTime={normalizedEntered}
        shiftStartTime={normalizedShift}
        diff={diff}
        isWarning={isWarning}
        messageFormatter={messageFormatter}
      />
    </div>
  );
}