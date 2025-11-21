import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Companies from "./pages/companies";
import CompanyDetails from "./pages/company-details";
import { Analytics } from '@vercel/analytics/next';

const ShootlensDashboard = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Companies />} />
                <Route path="/company/:symbol" element={<CompanyDetails />} />
                  <Analytics />
            </Routes>
        </Router>
    )
}

export default ShootlensDashboard;