const Header = ({ count, hideCount, children, hasGradient }) => {
    return (
        <>
            <div className={`flex items-center justify-between md:px-6 px-[10px] pt-5 pb-3 z-50 ${hasGradient ? "bg-gradient-to-r from-[rgb(251,251,251)] via-[rgb(206,220,244)] to-[rgb(210,225,247)]" : "bg-white"}`}>
                <div className="relative">
                    <div className="text-3xl font-bold text-[#002663] leading-normal">Shootlens</div>
                    <div className="text-[11px] font-medium text-[#4d4f53] w-full flex justify-end absolute top-8 right-0.5">Analytics</div>
                </div>
                {!hideCount ? (
                    <div>
                        <div className="text-sm text-black font-medium leading-normal">Total: <span className="text-[16px] text-black font-medium leading-normal">{count}</span></div>
                    </div>
                ) : (
                    <div>{children}</div>
                )}
            </div>
        </>
    )
}

export default Header;