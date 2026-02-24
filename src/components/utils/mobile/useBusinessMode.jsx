export function useBusinessMode(employee) {
  if (employee?.department === "PakketDistributie") {
    return "AUTO_RIT";
  }
  return "HANDMATIG";
}