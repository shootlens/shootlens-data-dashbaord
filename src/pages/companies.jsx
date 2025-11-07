import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, BASE_URL, API_KEY } from "../utils/apiClient";

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

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    const filteredCompanies = companies.filter((company) => /^[A-Za-z]+$/.test(company.trading_symbol))

    return (
        <div>
            <Header count={filteredCompanies.length} />
            <div className="px-20 pt-10">
                <table className="table-auto border w-full">
                    <thead className="border-b bg-gray-100">
                        <tr>
                            <th className="border px-3 py-2">No</th>
                            <th className="border px-3 py-2">Name</th>
                            <th className="border px-3 py-2">Symbol</th>
                        </tr>
                    </thead>
                    <tbody>
                        {companies.filter((company) => /^[A-Za-z]+$/.test(company.trading_symbol)).map((company, index) => (
                            <tr
                                key={index}
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => navigate(`/company/${company.trading_symbol}`)}
                            >
                                <td className="border px-3 py-2">{index + 1}</td>
                                <td className="border px-3 py-2">{company.name}</td>
                                <td className="border px-3 py-2">{company.trading_symbol}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default Companies;
