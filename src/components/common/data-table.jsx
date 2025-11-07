const DataTable = ({ title, data }) => {
  if (!data || data.length === 0) return null;

  const headers = data[0];
  const rows = data.slice(1);

  return (
    <div className="my-6 overflow-x-auto">
     {title&&<h2 className="text-lg font-semibold mb-2">{title || ""}</h2>}
      <table className="table-auto border-collapse border border-gray-300 w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="border border-gray-300 px-3 py-2 text-left">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, i) => (
                <td key={i} className="border border-gray-300 px-3 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
