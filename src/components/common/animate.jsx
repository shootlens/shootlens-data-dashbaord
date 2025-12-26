import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const Animate = ({
    children,
    y = 30,
    duration = 0.4,
    delay = 0,
    className = ''
}) => {
    const ref = useRef(null);
    const inView = useInView(ref, {
        margin: "-100px",
    });

    return (
        <motion.div
            className={className}
            ref={ref}
            animate={
                inView
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y }
            }
            initial={{ opacity: 0, y }}
            transition={{
                duration,
                delay,
                ease: "easeOut",
            }}
        >
            {children}
        </motion.div>
    );
};

export default Animate