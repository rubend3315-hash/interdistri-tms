import { useMemo } from "react";

export const useMobileEntryMode = (employee) => {
  return useMemo(() => {
    const mobileType = (employee?.mobile_entry_type || "").toLowerCase();
    const isMultiDay = mobileType.includes("meerdaags") || mobileType === "multi_day";

    return {
      isMultiDay,
      mode: isMultiDay ? "multi_day" : "single_day",
      maxPeriodDays: 7,
    };
  }, [employee?.mobile_entry_type]);
};