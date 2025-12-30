import { useState } from "react";
import ConfettiExplosion from "react-confetti-explosion";
import { COLORS } from "../../constants";

const ConfettiComponent = ({
  text = "Button Text",
  icon,
  onClick,
}) => {

  const handleClick = () => {
    onClick?.();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <div
        className="flex items-center gap-[10px] cursor-pointer select-none border rounded-[5px] px-2 py-[2px]"
        style={{borderColor:COLORS.border}}
        onClick={handleClick}
      >
        {icon && <div>{icon}</div>}
        <div>{text}</div>
      </div>

      {text.includes("Table") && (
        <ConfettiExplosion
          force={0.5}
          duration={4000}
          particleCount={200}
          width={2000}
        />
      )}
    </div>
  );
};

export default ConfettiComponent;
