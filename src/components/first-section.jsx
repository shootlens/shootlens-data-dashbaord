import { useEffect, useState } from "react";
import ImgLogo from "../assets/bull-vector.png"
import SplashCursor from "./SplashCursor";

const FirstSection = () => {
    const Typewriter = ({ words, typingSpeed = 120, deletingSpeed = 70, delay = 1200 }) => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
      if (!deleting && subIndex === words[index].length) {
        setTimeout(() => setDeleting(true), delay);
        return;
      }

      if (deleting && subIndex === 0) {
        setDeleting(false);
        setIndex((prev) => (prev + 1) % words.length);
        return;
      }

      const timeout = setTimeout(() => {
        setSubIndex((prev) => prev + (deleting ? -1 : 1));
      }, deleting ? deletingSpeed : typingSpeed);

      return () => clearTimeout(timeout);
    }, [subIndex, deleting, index]);

    return (
      <div className="w-[300px] ml-4 text-start">
        <span className="border-r-2 border-[#28385e] pr-1 text-[#194769]">
          {words[index].substring(0, subIndex)}
        </span>
      </div>
    );
  };
    return (
        <>
            <div className="relative">
                <SplashCursor/>
                <div className="hidden md:block">
                <div className="flex items-center justify-center bg-gradient-to-r from-[rgb(251,251,251)] via-[rgb(206,220,244)] to-[rgb(213,225,244)] h-[94vh] relative">
                    <div className="absolute top-[22%] flex items-center flex-col">
                        <img src={ImgLogo} className="h-[200px] flex justify-center w-[200px]" />

                        <div className="lg:text-7xl md:text-7xl text-[32px] font-semibold text-center flex flex-wrap justify-center text-[#28385e]">
                            <div>From Data to</div>
                            <Typewriter words={["Decisions..", "Insights..", "Growth.."]} />
                        </div>
                        <div className="text-center text-[13px] sm:text-lg py-4 text-[#304163] font-medium">
                            Every number tells a story. We transform data into powerful narratives that inspire action and fuel growth.
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </>
    )
}
export default FirstSection