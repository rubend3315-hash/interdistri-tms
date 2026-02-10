import React from "react";

export default function DraggableResourceBadge({ resourceType, resourceId, label, className, children }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "resource",
      resourceType,
      resourceId,
      resourceLabel: label
    }));
    e.dataTransfer.effectAllowed = "copy";
    e.currentTarget.classList.add("opacity-50");
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove("opacity-50");
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`cursor-grab active:cursor-grabbing ${className || ''}`}
    >
      {children}
    </div>
  );
}