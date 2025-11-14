import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, BASE_URL, API_KEY } from "../utils/apiClient";
import { COLORS } from "../constants";

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Same function call, now it will use IndexedDB internally.
        const data = await rateLimitedFetch(
          `${BASE_URL}/all_companies?api_key=${API_KEY}`,
          "companies_cache",
          "companies"
        );

        // Handle case if IndexedDB or localStorage returned old cache
        if (data?.error) {
          setError(data.message);
        } else {
          setCompanies(data.data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading)
    return (
      <div className="px-20 pt-10">
        <div>
          <div className="h-12 w-1/3 bg-gray-100 mb-4 rounded animate-pulse"></div>
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex space-x-4 mb-3">
              <div className="h-11 w-30 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-11 flex-1 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-11 w-1/3 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  if (error) return <div>{error}</div>;

  const filteredCompanies = companies.filter((company) => /^[A-Za-z]+$/.test(company.trading_symbol))

  return (
    <div>
      <Header count={filteredCompanies.length} />
      <div className="sm:p-10 p-5 overflow-auto">
        <table className="table-auto border w-full overflow-auto">
          <thead className="border-b bg-gray-100">
            <tr>
              <th style={{ color: COLORS.titleText, borderColor:COLORS.border }} className="border py-3 text-sm text-center">No</th>
              <th style={{ color: COLORS.titleText, borderColor: COLORS.border }} className="border px-5 py-3 text-sm text-start">Name</th>
              <th style={{ color: COLORS.titleText, borderColor:COLORS.border }} className="border px-5 py-3 text-sm text-start">Symbol</th>
            </tr>
          </thead>
          <tbody>
            {companies.filter((company) => /^[A-Za-z]+$/.test(company.trading_symbol)).map((company, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/company/${company.trading_symbol}`)}
              >
                <td style={{ color: COLORS.secondaryText, borderColor:COLORS.border }} className="border px-3 py-2 text-sm text-center">{index + 1}</td>
                <td style={{ color: COLORS.secondaryText, borderColor:COLORS.border }} className="border px-5 py-2 text-sm">{company.name}</td>
                <td style={{ color: COLORS.secondaryText, borderColor:COLORS.border }} className="border px-5 py-2 text-sm">{company.trading_symbol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Companies;
