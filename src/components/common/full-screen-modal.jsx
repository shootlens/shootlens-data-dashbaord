import { RxCross2 } from "react-icons/rx"

const FullScreenModal = ({ onClose, title, chart }) => {
    return (
        <div>
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="cursor-pointer"
                        >
                            <RxCross2 />
                        </button>
                    </div>
                    <div className="flex-1">{chart}</div>
                </div>
            </div>
        </div>
    )
}
export default FullScreenModal