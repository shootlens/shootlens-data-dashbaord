const Header = ({ count, hideCount }) => {
    return (
        <>
            <div className="flex items-center justify-between px-10 pt-5 pb-3 border-b border-[#D1D5DB]">
                <div className="text-3xl font-bold text-green-300 leading-normal">Shootlens</div>
                {!hideCount ? <div>
                    <div>Total: <span className="text-lgn text-black font-medium leading-normal">{count}</span></div>
                </div> : <div></div>}
            </div>
        </>
    )
}

export default Header;