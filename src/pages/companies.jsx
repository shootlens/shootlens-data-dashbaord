import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, BASE_URL, API_KEY } from "../utils/apiClient";
import { COLORS } from "../constants";
import { RiSlashCommands2 } from "react-icons/ri";
import { BsCommand } from "react-icons/bs";
import { TbLetterKSmall } from "react-icons/tb";


const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef(null);

  const navigate = useNavigate();


  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await rateLimitedFetch(
          `${BASE_URL}/all_companies?api_key=${API_KEY}`,
          "companies_cache",
          "companies"
        );

        if (data?.error) setError(data.message);
        else setCompanies(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(t);
  }, [search]);


  const highlightMatch = (text, query) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === query ? (
        <span
          key={i}
          className="bg-yellow-200 text-black px-0.5 rounded"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const filteredCompanies = companies
    .filter((c) => /^[A-Za-z]+$/.test(c.trading_symbol))
    .filter((c) => {
      if (!debouncedSearch) return true;
      return (
        c.name.toLowerCase().includes(debouncedSearch) ||
        c.trading_symbol.toLowerCase().includes(debouncedSearch)
      );
    });

  if (loading) {
    return (
      <div className="md:px-20 pt-10 px-[10px]">
        <div className="h-12 w-1/3 bg-gray-100 mb-4 rounded animate-pulse"></div>
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex space-x-4 mb-3">
            <div className="h-11 w-30 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-11 flex-1 bg-gray-100 rounded animate-pulse"></div>
            <div className="h-11 w-1/3 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div>{error}</div>;

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
    <div>
      <Header hideCount hasGradient />
      <div>
        <div className="hidden md:block">
          <div className="flex items-center justify-center bg-gradient-to-r from-[rgb(251,251,251)] via-[rgb(206,220,244)] to-[rgb(213,225,244)] h-[94vh] relative">
            <div className="absolute top-[35%]">
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
        <div className="px-[15px]">
          <div className="text-sm font-medium py-4 sm:flex justify-between items-center md:flex-row">
            <div
              className="relative border rounded-[5px] md:w-1/3 mb-4 sm:my-0 flex items-center"
              style={{ borderColor: COLORS.border }}
            >
              <input
                ref={searchInputRef}
                className="border-none px-[10px] py-[6px] w-full focus:outline-none"
                placeholder="Search Company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {!search && <div className="flex items-center gap-1 mr-2">
                <RiSlashCommands2 className="h-5 w-5 text-[#D1D5DB]" />
                <div className="flex items-center border border-[#D1D5DB] rounded-[5px] pl-1">
                  <BsCommand className="h-3 w-3 text-[#D1D5DB]" />
                  <TbLetterKSmall className="h-4.5 w-4.5 text-[#D1D5DB]" />
                </div>

              </div>}
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Total:</span>
              <span className="text-[16px] font-semibold">
                {filteredCompanies.length}
              </span>
            </div>
          </div>
          <div className="h-[79vh] overflow-y-auto" style={{ borderColor: COLORS.border }}>
            <table className="table-auto border w-full">
              <thead className="border-b bg-gray-100 overflow-hidden" style={{ borderColor: COLORS.border }}>
                <tr>
                  <th className="border py-3 text-sm text-center" style={{ borderColor: COLORS.border, color: COLORS.titleText }}>No</th>
                  <th className="border px-5 py-3 text-sm text-start" style={{ borderColor: COLORS.border, color: COLORS.titleText }}>Name</th>
                  <th className="border px-5 py-3 text-sm text-start" style={{ borderColor: COLORS.border, color: COLORS.titleText }}>Symbol</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="text-center py-10 text-gray-500 text-sm"
                    >
                      No companies found for "<span className="font-semibold">{debouncedSearch}</span>"
                    </td>
                  </tr>
                )}
                {filteredCompanies.map((company, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/company/${company.trading_symbol}`)}
                  >
                    <td className="border px-3 py-2 text-sm text-center" style={{ borderColor: COLORS.border, color: COLORS.secondaryText }}>
                      {index + 1}
                    </td>

                    <td className="border px-5 py-2 text-sm" style={{ borderColor: COLORS.border, color: COLORS.secondaryText }}>
                      {highlightMatch(company.name, debouncedSearch)}
                    </td>

                    <td className="border px-5 py-2 text-sm" style={{ borderColor: COLORS.border, color: COLORS.secondaryText }}>
                      {highlightMatch(company.trading_symbol, debouncedSearch)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="text-[12px] text-[#6B7280] font-normal leading-normal py-4 px-10">
          Made With 💚 by Ragava
        </div>
      </div>
    </div>
  );
};

export default Companies;
