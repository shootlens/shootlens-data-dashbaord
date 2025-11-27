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
      <div className="md:px-20 pt-10 px-[10px]">
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


  const Typewriter = ({ words, typingSpeed = 120, deletingSpeed = 70, delay = 1200 }) => {
    const [index, setIndex] = useState(0); // current word index
    const [subIndex, setSubIndex] = useState(0); // current letter index
    const [deleting, setDeleting] = useState(false); // deleting phase or not

    useEffect(() => {
      if (!deleting && subIndex === words[index].length) {
        // Finished typing → pause → start deleting
        setTimeout(() => setDeleting(true), delay);
        return;
      }

      if (deleting && subIndex === 0) {
        // Finished deleting → go to next word
        setDeleting(false);
        setIndex((prev) => (prev + 1) % words.length);
        return;
      }

      const timeout = setTimeout(() => {
        setSubIndex((prev) => prev + (deleting ? -1 : 1));
      }, deleting ? deletingSpeed : typingSpeed);

      return () => clearTimeout(timeout);
    }, [subIndex, deleting, index, words, typingSpeed, deletingSpeed, delay]);

    return (
      <div className="w-[300px] ml-4 text-start">
        <span className="border-r-2 border-[#28385e] pr-1 w-auto text-[#194769]">
          {words[index].substring(0, subIndex)}
        </span>
      </div>

    );
  };

  return (
    <div>
      <Header hideCount hasGradient />
      <div>
        <div className="hidden md:block">
          <div className="flex items-center justify-center bg-gradient-to-r to-[rgb(251,251,251)] via-[rgb(206,220,244)] from-[rgb(183,204,235)] h-[94vh] relative">
            <div className="absolute top-[35%]">
              <div className="lg:text-7xl md:text-7xl text-[32px] font-semibold text-center flex flex-wrap justify-center text-[#28385e]">
                <div>From Data to</div>
                <Typewriter
                  words={[
                    "Decisions..",
                    "Insights..",
                    "Growth..",
                  ]}
                  typingSpeed={120}
                  deletingSpeed={70}
                  delay={1200}
                />
              </div>
              <div className="text-center text-[13px] sm:text-lg lg:text-lg py-4 text-[#304163] font-medium">Every number tells a story. We transform data into powerful narratives that inspire action and fuel growth.</div>
            </div>
          </div>
        </div>
        <div className="sm:p-10 p-5 overflow-auto">
          <div className="text-sm text-black font-medium leading-normal py-4 justify-end flex">Total: <span className="text-[16px] text-black font-medium leading-normal">{filteredCompanies.length} </span></div>
          <table className="table-auto border w-full overflow-auto">
            <thead className="border-b bg-gray-100">
              <tr>
                <th style={{ color: COLORS.titleText, borderColor: COLORS.border }} className="border py-3 text-sm text-center">No</th>
                <th style={{ color: COLORS.titleText, borderColor: COLORS.border }} className="border px-5 py-3 text-sm text-start">Name</th>
                <th style={{ color: COLORS.titleText, borderColor: COLORS.border }} className="border px-5 py-3 text-sm text-start">Symbol</th>
              </tr>
            </thead>
            <tbody>
              {companies.filter((company) => /^[A-Za-z]+$/.test(company.trading_symbol)).map((company, index) => (
                <tr
                  key={index}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/company/${company.trading_symbol}`)}
                >
                  <td style={{ color: COLORS.secondaryText, borderColor: COLORS.border }} className="border px-3 py-2 text-sm text-center">{index + 1}</td>
                  <td style={{ color: COLORS.secondaryText, borderColor: COLORS.border }} className="border px-5 py-2 text-sm">{company.name}</td>
                  <td style={{ color: COLORS.secondaryText, borderColor: COLORS.border }} className="border px-5 py-2 text-sm">{company.trading_symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};

export default Companies;
