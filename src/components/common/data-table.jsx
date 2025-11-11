import { COLORS } from "../../constants";
const DataTable = ({ title, data }) => {
  if (!data || data.length === 0) return null;

  const headers = data[0];
  const rows = data.slice(1);

  return (
    <div className="my-6 overflow-x-auto">
      {title && <h2 className="text-lg font-semibold mb-2">{title}</h2>}
      <div
        className={`rounded-[10px] border border-[${COLORS.border}] overflow-hidden`}
      >
        <table className="table-auto w-full border-collapse">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={`px-3 py-3 text-left text-sm text-[${COLORS.titleText}] font-semibold leading-normal border-b border-[${COLORS.border}]`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 text-sm text-[${COLORS.titleText}] font-normal leading-normal border-t border-[${COLORS.border}]`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
