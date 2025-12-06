import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/AccountsOfficerDashboard.css";

// Add responsive styles for main dashboard here for fallback (for quick tests; should move to CSS)
const responsiveStyle = {
  '--gap': '18px',
};
const responsiveMedia = `
@media (max-width: 1050px) {
  .ao-main-content { padding: 0 0 32px 0 !important; }
}
@media (max-width: 850px) {
  .ao-content { padding: 16px 0 !important; }
  .overview-cards {
    flex-wrap: wrap !important;
    gap: 18px !important;
  }
  .metric-card { flex: 1 1 160px !important; min-width: 45vw !important; }
}
@media (max-width: 700px) {
  .ao-topbar {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 10px !important;
    padding: 10px 12px !important;
  }
  .topbar-right { flex-direction: column !important; gap: 10px !important; align-items: flex-start !important; }
  .search-container { width: 100% !important; }
  .overview-cards { flex-direction: column !important; }
  .metric-card { min-width: 90vw !important; max-width: 100vw !important; }
  .section-header {
    flex-direction: column !important;
    gap: 10px !important;
    align-items: flex-start !important;
  }
}
@media (max-width: 600px) {
  .ao-dashboard { padding: 0 !important; }
  .ao-main-content { margin: 0 !important; padding: 0 !important; width: 100vw; }
  .overview-cards { gap: 11px !important; }
  .metric-card { min-width: 95vw !important; max-width: 100vw !important; font-size: 0.97rem !important;}
  .activity-table th, .activity-table td { font-size: .91rem !important;}
  .upload-card { padding: 9px 7px !important; }
  .upload-actions { flex-direction: column !important; gap: 8px !important; }
  .ebill-modal-content {
    min-width: 95vw !important;
    min-height: unset !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}
@media (max-width: 500px) {
  .ao-dashboard, .ao-main-content, .ao-content { padding: 0 !important; }
  .overview-cards, .metric-card, .activity-section, .section-header {
    min-width: unset !important; max-width: 100vw !important;
  }
  .upload-card { padding: 0 3vw 0 3vw !important; font-size: 0.98rem !important;}
  .upload-header h3 { font-size: 1.07rem !important;}
  .upload-header p { font-size: .97rem !important;}
  .filter-controls { width: 100% !important;}
}
`;

// Adapted for real API response
export default function AccountsOfficerDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    totalWorks: 0,
    pendingApprovals: 0,
    totalPayments: 0,
    alerts: 0,
  });

  const [ebills, setEbills] = useState([]);
  const [billReductions, setBillReductions] = useState({});
  const [showBill, setShowBill] = useState(false);
  const [activeBill, setActiveBill] = useState(null);

  const [showReductionFields, setShowReductionFields] = useState(false);
  const [reductionValues, setReductionValues] = useState({ cgst: "", sgst: "", royalty: "" });
  const [reductionErrors, setReductionErrors] = useState({});
  const [reductionLoading, setReductionLoading] = useState(false);
  const [reductionApiError, setReductionApiError] = useState("");

  // Inject responsive style tags only once per mount
  useEffect(() => {
    let tag = document.createElement("style");
    tag.innerHTML = responsiveMedia;
    document.head.appendChild(tag);
    return () => { document.head.removeChild(tag); };
  }, []);

  useEffect(() => {
    fetchEbills();
    // eslint-disable-next-line
  }, []);

  const fetchEbills = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("http://localhost:8085/account/ebill", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`API: ${res.statusText}`);
      const data = await res.json();

      let billsArray;
      if (Array.isArray(data)) {
        billsArray = data;
      } else if (data && typeof data === "object" && data.billId !== undefined) {
        billsArray = [data];
      } else {
        billsArray = [];
      }
      setEbills(billsArray);

      setDashboardStats({
        totalWorks: billsArray.length,
        pendingApprovals: billsArray.filter(e => e.status === "PENDING").length,
        totalPayments: billsArray.reduce(
          (acc, b) => acc + (b.status === "APPROVED" ? (b.totalAmount ?? 0) : 0), 0),
        alerts: billsArray.filter(e => e.status === "REJECTED" || e.status === "PENDING").length,
      });

      let reductions = {};
      for (const bill of billsArray) {
        reductions[bill.billId] = {
          cgst: bill.cgst,
          sgst: bill.sgst,
          royalty: bill.royalty
        };
      }
      setBillReductions(reductions);

    } catch (err) {
      console.error("Error fetching bills:", err);
      setEbills([]);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount ?? 0);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "APPROVED": return "status-approved";
      case "REJECTED": return "status-rejected";
      case "PENDING": return "status-pending";
      default: return "";
    }
  };

  const filteredEbills = ebills.filter(bill => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (bill.contractorName?.toLowerCase().includes(q)) ||
      (bill.workId?.toLowerCase().includes(q)) ||
      (bill.workName?.toLowerCase().includes(q));
    const matchesFilter = filterStatus === "all" || bill.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Removed upload section: handleFileUpload is now not used, 
  // but may be kept if added elsewhere in future.

  const handleShowBill = (bill) => {
    setActiveBill(bill);
    setShowBill(true);
    setShowReductionFields(false);
    setReductionValues({
      cgst: bill.cgst ?? "",
      sgst: bill.sgst ?? "",
      royalty: bill.royalty ?? ""
    });
    setReductionErrors({});
    setReductionApiError("");
  };

  const handleHideBill = () => {
    setActiveBill(null);
    setShowBill(false);
    setShowReductionFields(false);
    setReductionValues({
      cgst: "",
      sgst: "",
      royalty: ""
    });
    setReductionErrors({});
    setReductionApiError("");
  };

  const handleAddReductionClick = () => {
    setShowReductionFields((show) => !show);
    setReductionErrors({});
    setReductionApiError("");
    if (!showReductionFields && activeBill) {
      setReductionValues({
        cgst: activeBill.cgst ?? "",
        sgst: activeBill.sgst ?? "",
        royalty: activeBill.royalty ?? ""
      });
    }
  };

  const validateReductionForm = (vals) => {
    let errs = {};
    if (
      (vals.cgst === "" || vals.cgst === null) &&
      (vals.sgst === "" || vals.sgst === null) &&
      (vals.royalty === "" || vals.royalty === null)
    ) {
      errs.form = "Enter at least one reduction amount.";
    }
    if (vals.cgst !== "" && vals.cgst !== null && (isNaN(vals.cgst) || Number(vals.cgst) < 0)) {
      errs.cgst = "CGST cannot be negative";
    }
    if (vals.sgst !== "" && vals.sgst !== null && (isNaN(vals.sgst) || Number(vals.sgst) < 0)) {
      errs.sgst = "SGST cannot be negative";
    }
    if (vals.royalty !== "" && vals.royalty !== null && (isNaN(vals.royalty) || Number(vals.royalty) < 0)) {
      errs.royalty = "Royalty cannot be negative";
    }
    return errs;
  };

  const handleReductionChange = (e) => {
    const { name, value } = e.target;
    setReductionValues(prev => ({
      ...prev,
      [name]: value
    }));
    setReductionErrors({});
    setReductionApiError("");
  };

  const handleRegenerateBill = async (e) => {
    e.preventDefault();
    if (!activeBill) return;

    const payload = {
      billId: activeBill.billId,
      cgst: reductionValues.cgst === "" ? 0 : Number(reductionValues.cgst),
      sgst: reductionValues.sgst === "" ? 0 : Number(reductionValues.sgst),
      royalty: reductionValues.royalty === "" ? 0 : Number(reductionValues.royalty),
    };
    payload.totalReduction = (payload.cgst || 0) + (payload.sgst || 0) + (payload.royalty || 0);

    const errs = validateReductionForm(reductionValues);
    setReductionErrors(errs);
    setReductionApiError("");
    if (Object.keys(errs).length > 0)
      return;

    setReductionLoading(true);

    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("http://localhost:8085/ebill/applyReduction", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errMsg = (await res.text()) || "Error applying reduction";
        setReductionApiError(errMsg);
        setReductionLoading(false);
        return;
      }

      const updatedBill = await res.json();

      setActiveBill(updatedBill);

      setEbills(current =>
        current.map(b =>
          b.billId === updatedBill.billId ? updatedBill : b
        )
      );

      setShowReductionFields(false);
    } catch (error) {
      setReductionApiError("Server error or connection failed.");
    } finally {
      setReductionLoading(false);
    }
  };

  const handleApprove = async (billId) => {
    const bill = ebills.find(b => b.billId === billId);
    if (!bill || !bill.workId) {
      setEbills(arr =>
        arr.map(b =>
          b.billId === billId
            ? { ...b, status: "APPROVED" }
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === billId ? { ...prev, status: "APPROVED" } : prev
      );
      setShowBill(false);
      return;
    }
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `http://localhost:8085/account/approve/${encodeURIComponent(bill.workId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        setEbills(arr =>
          arr.map(b =>
            b.billId === billId
              ? { ...b, status: "APPROVED" }
              : b
          )
        );
        setActiveBill(prev =>
          prev && prev.billId === billId ? { ...prev, status: "APPROVED" } : prev
        );
        setShowBill(false);
        return;
      }

      const updatedBill = await res.json();
      setEbills(arr =>
        arr.map(b =>
          b.billId === updatedBill.billId
            ? updatedBill
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === updatedBill.billId ? updatedBill : prev
      );
    } catch (e) {
      setEbills(arr =>
        arr.map(b =>
          b.billId === billId
            ? { ...b, status: "APPROVED" }
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === billId ? { ...prev, status: "APPROVED" } : prev
      );
    }
    setShowBill(false);
  };

  const handleReject = async (billId) => {
    const bill = ebills.find(b => b.billId === billId);
    if (!bill || !bill.workId) {
      setEbills(arr =>
        arr.map(b =>
          b.billId === billId
            ? { ...b, status: "REJECTED" }
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === billId ? { ...prev, status: "REJECTED" } : prev
      );
      setShowBill(false);
      return;
    }
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `http://localhost:8085/account/reject/${encodeURIComponent(bill.workId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        setEbills(arr =>
          arr.map(b =>
            b.billId === billId
              ? { ...b, status: "REJECTED" }
              : b
          )
        );
        setActiveBill(prev =>
          prev && prev.billId === billId ? { ...prev, status: "REJECTED" } : prev
        );
        setShowBill(false);
        return;
      }

      const updatedBill = await res.json();
      setEbills(arr =>
        arr.map(b =>
          b.billId === updatedBill.billId
            ? updatedBill
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === updatedBill.billId ? updatedBill : prev
      );
    } catch (e) {
      setEbills(arr =>
        arr.map(b =>
          b.billId === billId
            ? { ...b, status: "REJECTED" }
            : b
        )
      );
      setActiveBill(prev =>
        prev && prev.billId === billId ? { ...prev, status: "REJECTED" } : prev
      );
    }
    setShowBill(false);
  };

  const getReductionTotal = () =>
    (parseFloat(reductionValues.cgst) || 0) +
    (parseFloat(reductionValues.sgst) || 0) +
    (parseFloat(reductionValues.royalty) || 0);

  const hasReductions = (bill) => !!bill.reductionIsApplied;

  return (
    <div className="ao-dashboard" style={responsiveStyle}>
      {/* Responsive style fallback for small devices */}
      {/* REMOVED SIDEBAR */}
      <div className="ao-main-content" style={{ marginLeft: 0, width: "100%", boxSizing: "border-box" }}>
        {/* Top Navigation Bar */}
        <header className="ao-topbar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: "wrap",
          gap: "16px",
          padding: "17px 24px",
          background: "#fcfcff",
          zIndex: 4,
          boxShadow: "0 2px 10px #eef6ff71"
        }}>
          <div className="topbar-left" style={{flex: 1, minWidth: 160}}>
            <h1 style={{
              fontSize: '1.62rem',
              margin: 0,
              fontWeight: 700,
              color: "#1a237e",
              letterSpacing: "-0.02em",
              wordBreak: 'break-word'
            }}>
              Accounts Officer Dashboard
            </h1>
          </div>
          <div className="topbar-right" style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "14px", flexWrap: "wrap"
          }}>
            <div className="search-container" style={{
              display: "flex",
              alignItems: "center",
              background: "#f7fafd",
              borderRadius: "6px",
              border: "1.1px solid #e0e9f2",
              padding: "3px 12px",
              minWidth: "190px",
              width: "fit-content"
            }}>
              <span className="search-icon" style={{
                marginRight: "4px",
                color: "#888",
                fontSize: "1.16em"
              }}>🔍</span>
              <input
                type="text"
                placeholder="Search works, contractors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "1.04rem",
                  flex: 1,
                  minWidth: 0
                }}
              />
            </div>
            <div className="user-info" style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <span className="user-name" style={{
                fontWeight: 600,
                color: "#37465e"
              }}>{user?.username || "Account Officer"}</span>
              <button className="logout-btn-top" onClick={handleLogout}
                style={{
                  padding: "6px 19px",
                  borderRadius: "16px",
                  border: "none",
                  background: "#fff5e0",
                  color: "#b3460c",
                  fontWeight: 600,
                  fontSize: "1.03rem",
                  cursor: "pointer",
                  marginLeft: "6px"
                }}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="ao-content" style={{
          padding: "32px 26px",
          maxWidth: "1450px",
          margin: "0 auto"
        }}>
          {/* Overview Cards */}
          <section className="overview-cards" style={{
            display: "flex",
            gap: "28px",
            marginBottom: "35px",
            flexWrap: "wrap",
            justifyContent: "space-between"
          }}>
            <div className="metric-card" style={{
              background: "#fff",
              borderRadius: "13px",
              boxShadow: "0 2.5px 16px #e3ecfcbb",
              padding: "15px 22px",
              flex: "1 1 220px",
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              gap: "13px",
              maxWidth: "calc(25% - 28px)"
            }}>
              <div className="card-icon" style={{
                background: '#E3F2FD',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: '24px' }}>🏗️</span>
              </div>
              <div className="card-content" style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: "1.09rem", fontWeight: 600, margin: 0 }}>Total Works</h3>
                <p className="metric-value" style={{ fontWeight: 700, fontSize: "1.13rem", margin: 0 }}>
                  {dashboardStats.totalWorks}
                </p>
                <span className="metric-label" style={{ color: "#6a88a6", fontWeight: 500, fontSize: ".97em" }}>Active projects</span>
              </div>
            </div>
            <div className="metric-card" style={{
              background: "#fff",
              borderRadius: "13px",
              boxShadow: "0 2.5px 16px #e3ecfcbb",
              padding: "15px 22px",
              flex: "1 1 220px",
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              gap: "13px",
              maxWidth: "calc(25% - 28px)"
            }}>
              <div className="card-icon" style={{
                background: '#FFF3E0',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: '24px' }}>⏳</span>
              </div>
              <div className="card-content">
                <h3 style={{ fontSize: "1.09rem", fontWeight: 600, margin: 0 }}>Pending Approvals</h3>
                <p className="metric-value warning" style={{ fontWeight: 700, fontSize: "1.13rem", margin: 0, color: "#F38205" }}>{dashboardStats.pendingApprovals}</p>
                <span className="metric-label" style={{ color: "#BC7000", fontWeight: 500, fontSize: ".97em" }}>Requires attention</span>
              </div>
            </div>
            <div className="metric-card" style={{
              background: "#fff",
              borderRadius: "13px",
              boxShadow: "0 2.5px 16px #e3ecfcbb",
              padding: "15px 22px",
              flex: "1 1 220px",
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              gap: "13px",
              maxWidth: "calc(25% - 28px)"
            }}>
              <div className="card-icon" style={{
                background: '#E8F5E9',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: '24px' }}>💰</span>
              </div>
              <div className="card-content">
                <h3 style={{ fontSize: "1.09rem", fontWeight: 600, margin: 0 }}>Total Payments</h3>
                <p className="metric-value" style={{ fontWeight: 700, fontSize: "1.13rem", margin: 0, color: "#218833" }}>{formatCurrency(dashboardStats.totalPayments)}</p>
                <span className="metric-label" style={{ color: "#388e3c", fontWeight: 500, fontSize: ".97em" }}>Processed this month</span>
              </div>
            </div>
            <div className="metric-card" style={{
              background: "#fff",
              borderRadius: "13px",
              boxShadow: "0 2.5px 16px #e3ecfcbb",
              padding: "15px 22px",
              flex: "1 1 220px",
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              gap: "13px",
              maxWidth: "calc(25% - 28px)"
            }}>
              <div className="card-icon" style={{
                background: '#FFEBEE',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
              </div>
              <div className="card-content">
                <h3 style={{ fontSize: "1.09rem", fontWeight: 600, margin: 0 }}>Alerts</h3>
                <p className="metric-value alert" style={{ fontWeight: 700, fontSize: "1.13rem", margin: 0, color: "#e12f2f" }}>{dashboardStats.alerts}</p>
                <span className="metric-label" style={{ color: "#a00020", fontWeight: 500, fontSize: ".97em" }}>Action required</span>
              </div>
            </div>
          </section>

          {/* E-Bill Section */}
          <section className="activity-section" style={{ marginBottom: "25px" }}>
            <div className="section-header" style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "22px",
              marginBottom: "16px",
              flexWrap: "wrap"
            }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#123687" }}>E-Bills</h2>
              <div className="filter-controls" style={{ minWidth: 130 }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                  style={{
                    borderRadius: "6px",
                    padding: "6px 17px",
                    fontSize: "1.03rem",
                    border: "1.05px solid #b9c9fc",
                    background: "#fcfdff",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="table-container" style={{
              overflowX: "auto",
              background: "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 8px #f3f2ee",
              padding: "0",
              minHeight: "130px"
            }}>
              {loading ? (
                <div className="loading-state" style={{ padding: "29px 7px", fontSize: "1.07rem", color: "#353" }}>Loading...</div>
              ) : filteredEbills.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 7px", fontSize: "1.08rem", color: "#516" }}>No E-bills found</div>
              ) : (
                <table className="activity-table" style={{
                  width: "100%",
                  minWidth: 560,
                  borderCollapse: "collapse",
                  fontSize: "1.01rem"
                }}>
                  <thead>
                    <tr>
                      <th>E-Bill</th>
                      <th>Work ID</th>
                      <th>Work Name</th>
                      <th>Contractor</th>
                      <th>Total Qty</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEbills.map((bill) => (
                      <tr key={bill.billId}>
                        <td>
                          <span style={{ fontWeight: 600, wordBreak: "break-all" }}>E-Bill #{bill.billId}</span>
                        </td>
                        <td>{bill.workId}</td>
                        <td style={{ minWidth: 110, wordBreak: "break-word" }}>{bill.workName}</td>
                        <td style={{ minWidth: 110, wordBreak: "break-word" }}>{bill.contractorName}</td>
                        <td>{bill.totalQuantity ?? "--"}</td>
                        <td className="amount">{formatCurrency(bill.totalAmount ?? 0)}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(bill.status)}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td>{formatDate(bill.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="Show Bill"
                              onClick={() => handleShowBill(bill)}
                              style={{
                                padding: "5px 13px",
                                borderRadius: "7px",
                                background: "#e2f6ed",
                                color: "#11532a",
                                fontWeight: "600",
                                border: "1.1px solid #a6dec4",
                                fontSize: ".98rem",
                                cursor: "pointer",
                                marginBottom: 2
                              }}
                            >Show Bill</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bill popup */}
            {showBill && activeBill && (
              <div className="ebill-modal-overlay" style={{
                position: 'fixed',
                zIndex: 9999,
                top: 0, left: 0, right: 0, bottom: 0,
                background: "rgba(0,0,0,0.35)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: "0 4vw"
              }}>
                <div className="ebill-modal-content" style={{
                  background: '#fff',
                  borderRadius: '16px',
                  minWidth: '340px',
                  minHeight: '300px',
                  boxShadow: '0 8px 32px #3332',
                  maxWidth: '96vw',
                  maxHeight: '98vh',
                  overflowY: "auto",
                  position: "relative",
                  padding: '0'
                }}>
                  <button
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 20,
                      fontSize: "1.7rem",
                      background: "none",
                      border: "none",
                      color: "#888",
                      cursor: "pointer",
                      zIndex: 11
                    }}
                    onClick={handleHideBill}
                    aria-label="Close"
                  >×</button>
                  <div style={{ paddingTop: "40px", paddingBottom: "16px" }}>
                    <EbillSearchBillView bill={activeBill} />
                  </div>
                  <div
                    style={{
                      marginTop: "25px",
                      borderTop: "1px solid #e0e0e0",
                      paddingTop: "18px",
                      paddingBottom: "14px"
                    }}
                  >
                    {/* Only allow applying reductions if not already applied AND bill is still pending */}
                    {!hasReductions(activeBill) && activeBill.status === "PENDING" && (
                      <>
                        <button
                          onClick={handleAddReductionClick}
                          style={{
                            padding: "8px 18px",
                            borderRadius: "6px",
                            border: "1.1px solid #1976d2",
                            background: "#e3f2fd",
                            color: "#1a237e",
                            fontSize: "1.06rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginBottom: "10px",
                            width: "100%",
                            maxWidth: 300
                          }}
                        >
                          {showReductionFields ? "Cancel Reduction" : "Add Reduction"}
                        </button>
                        {showReductionFields && (
                          <form
                            onSubmit={handleRegenerateBill}
                            style={{
                              marginTop: "18px",
                              background: "#f8fafd",
                              padding: "20px 10px 12px 10px",
                              borderRadius: "10px",
                              boxShadow: "0 2px 14px #e0f6b744",
                              maxWidth: "500px",
                              width: "100%"
                            }}
                            autoComplete="off"
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: "1.17rem",
                                color: "#29691f",
                                marginBottom: "18px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                              }}
                            >
                              <span role="img" aria-label="Reduction">🔻</span>
                              Add Deductions on this Bill
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "13px 10px",
                                marginBottom: "10px"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <label htmlFor="reduction-cgst" style={{ color: "#33691e", fontWeight: 500 }}>CGST</label>
                                <input
                                  id="reduction-cgst"
                                  name="cgst"
                                  type="number"
                                  min="0"
                                  value={reductionValues.cgst}
                                  onChange={handleReductionChange}
                                  style={{
                                    padding: "7px 8px",
                                    borderRadius: 5,
                                    border: "1.1px solid #b6decb",
                                    fontSize: "1.04rem",
                                    marginTop: "3px",
                                    width: "100%"
                                  }}
                                  placeholder="e.g. 500"
                                  disabled={reductionLoading}
                                />
                                {reductionErrors.cgst && (
                                  <span style={{ color: "#d32f2f", fontSize: ".94rem", marginTop: "2px" }}>
                                    {reductionErrors.cgst}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <label htmlFor="reduction-sgst" style={{ color: "#33691e", fontWeight: 500 }}>SGST</label>
                                <input
                                  id="reduction-sgst"
                                  name="sgst"
                                  type="number"
                                  min="0"
                                  value={reductionValues.sgst}
                                  onChange={handleReductionChange}
                                  style={{
                                    padding: "7px 8px",
                                    borderRadius: 5,
                                    border: "1.1px solid #b6decb",
                                    fontSize: "1.04rem",
                                    marginTop: "3px",
                                    width: "100%"
                                  }}
                                  placeholder="e.g. 400"
                                  disabled={reductionLoading}
                                />
                                {reductionErrors.sgst && (
                                  <span style={{ color: "#d32f2f", fontSize: ".94rem", marginTop: "2px" }}>
                                    {reductionErrors.sgst}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gridColumn: "1/-1" }}>
                                <label htmlFor="reduction-royalty" style={{ color: "#33691e", fontWeight: 500 }}>
                                  Royalty
                                </label>
                                <input
                                  id="reduction-royalty"
                                  name="royalty"
                                  type="number"
                                  min="0"
                                  value={reductionValues.royalty}
                                  onChange={handleReductionChange}
                                  style={{
                                    padding: "7px 8px",
                                    borderRadius: 5,
                                    border: "1.1px solid #b6decb",
                                    fontSize: "1.04rem",
                                    marginTop: "3px",
                                    width: "100%"
                                  }}
                                  placeholder="e.g. 980"
                                  disabled={reductionLoading}
                                />
                                {reductionErrors.royalty && (
                                  <span style={{ color: "#d32f2f", fontSize: ".94rem", marginTop: "2px" }}>
                                    {reductionErrors.royalty}
                                  </span>
                                )}
                              </div>
                            </div>
                            {(reductionValues.cgst !== "" ||
                              reductionValues.sgst !== "" ||
                              reductionValues.royalty !== "") && (
                              <div
                                style={{
                                  margin: "10px 0 13px 0",
                                  fontWeight: 500,
                                  color: "#2e7d32",
                                  background: "#e6fcf6",
                                  padding: "7px 11px",
                                  borderRadius: "7px",
                                  fontSize: ".99rem"
                                }}
                              >
                                Total Reduction: <span style={{ fontWeight: 600, color: "#146818" }}>₹{getReductionTotal()}</span>
                              </div>
                            )}
                            {reductionErrors.form && (
                              <div style={{
                                background: "#ffe5e5",
                                color: "#d32f2f",
                                padding: "7px 9px",
                                fontWeight: 500,
                                borderRadius: 6,
                                marginBottom: "11px"
                              }}>
                                {reductionErrors.form}
                              </div>
                            )}
                            {reductionApiError && (
                              <div style={{
                                background: "#ffe5e5",
                                color: "#f00",
                                padding: "7px 9px",
                                fontWeight: 500,
                                borderRadius: 6,
                                marginBottom: "11px"
                              }}>
                                {reductionApiError}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end"
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  marginTop: "6px",
                                  padding: "8px 22px",
                                  borderRadius: "7px",
                                  background: "#1c8542",
                                  color: "#fff",
                                  border: "none",
                                  fontWeight: "600",
                                  letterSpacing: "0.01em",
                                  fontSize: "1.06rem",
                                  cursor: reductionLoading ? "wait" : "pointer",
                                  boxShadow:
                                    "0 1px 6px #c4f1e7",
                                  opacity: reductionLoading ? 0.7 : 1,
                                  width: "100%",
                                  maxWidth: 240
                                }}
                                disabled={reductionLoading}
                              >
                                {reductionLoading ? "Applying..." : "Regenerate Bill"}
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                    {hasReductions(activeBill) && activeBill.status === "PENDING" && (
                      <div style={{
                        marginTop: "10px",
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '12px'
                      }}>
                        <div style={{ alignSelf: 'flex-start' }}>
                          <span style={{ fontWeight: 600, color: '#2e7d32', marginRight: '15px' }}>
                            Deductions Applied:
                          </span>
                          <span>
                            {activeBill.cgst > 0 && <span>CGST: ₹{activeBill.cgst} &nbsp; </span>}
                            {activeBill.sgst > 0 && <span>SGST: ₹{activeBill.sgst} &nbsp; </span>}
                            {activeBill.royalty > 0 && <span>Royalty: ₹{activeBill.royalty}</span>}
                            {(!activeBill.cgst && !activeBill.sgst && !activeBill.royalty) && <span>None</span>}
                          </span>
                          <br />
                          <span style={{ fontWeight: 500, color: '#1a237e' }}>
                            Net Bill Amount: <span style={{ color: '#218833', fontWeight: 700 }}>
                              {formatCurrency(
                                (activeBill.netAmount != null)
                                  ? activeBill.netAmount
                                  : (activeBill.totalAmount -
                                    ((activeBill.cgst || 0) + (activeBill.sgst || 0) + (activeBill.royalty || 0)))
                              )}
                            </span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: "15px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleApprove(activeBill.billId)}
                            style={{
                              padding: "8px 22px",
                              borderRadius: "7px",
                              background: "#1c8542",
                              color: "#fff",
                              border: "none",
                              fontWeight: "600",
                              letterSpacing: "0.01em",
                              fontSize: "1.07rem",
                              cursor: "pointer",
                              boxShadow: "0 1px 6px #c4f1e7",
                              marginBottom: 4
                            }}
                          >Approve</button>
                          <button
                            onClick={() => handleReject(activeBill.billId)}
                            style={{
                              padding: "8px 22px",
                              borderRadius: "7px",
                              background: "#cf1818",
                              color: "#fff",
                              border: "none",
                              fontWeight: "600",
                              letterSpacing: "0.01em",
                              fontSize: "1.07rem",
                              cursor: "pointer",
                              boxShadow: "0 1px 6px #f1c4c4",
                              marginBottom: 4
                            }}
                          >Reject</button>
                        </div>
                      </div>
                    )}

                    {(activeBill.status === "APPROVED" || activeBill.status === "REJECTED") && (
                      <div>
                        <div style={{
                          marginTop: "10px",
                          padding: "11px 0 4px 0",
                          fontWeight: 600,
                          color: activeBill.status === "APPROVED" ? '#1a8833' : "#b21313",
                          borderRadius: 6
                        }}>
                          {activeBill.status === "APPROVED" && "This bill has been approved."}
                          {activeBill.status === "REJECTED" && "This bill has been rejected."}
                        </div>
                        {activeBill.status === "REJECTED" && (
                          <div style={{
                            marginTop: "12px",
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '15px',
                          }}>
                            <button
                              onClick={() => handleApprove(activeBill.billId)}
                              style={{
                                padding: "8px 22px",
                                borderRadius: "7px",
                                background: "#1c8542",
                                color: "#fff",
                                border: "none",
                                fontWeight: "600",
                                letterSpacing: "0.01em",
                                fontSize: "1.07rem",
                                cursor: "pointer",
                                boxShadow: "0 1px 6px #c4f1e7"
                              }}
                            >Approve</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

// Bill view card as per new API response, now responsive
function EbillSearchBillView({ bill }) {
  if (!bill) return null;

  const billPaperStyle = {
    margin: "20px auto",
    maxWidth: "650px",
    minWidth: 0,
    boxShadow: "0 0 14px #dedede",
    padding: "30px 20px 20px 20px",
    borderRadius: "14px",
    background:
      "repeating-linear-gradient(0deg, #fafafa, #fafafa 35px, #f0f0f0 36px, #fafafa 36px)",
    width: "100%",
    boxSizing: "border-box"
  };
  const headerBox = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: "16px 10vw",
    marginBottom: "12px"
  };
  const labelCell = { color: "#888", fontSize: "0.97rem" };
  const valueCell = { fontWeight: 600, color: "#1a237e" };

  const reductions = [
    (bill.cgst != null && bill.cgst !== 0) ? { label: "CGST", value: bill.cgst } : null,
    (bill.sgst != null && bill.sgst !== 0) ? { label: "SGST", value: bill.sgst } : null,
    (bill.royalty != null && bill.royalty !== 0) ? { label: "Royalty", value: bill.royalty } : null,
  ].filter(Boolean);

  return (
    <div style={billPaperStyle}>
      <div style={headerBox}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "1.07rem", color: "#5c5c5c", marginBottom: "2px", wordBreak: "break-word" }}>
            <b>Bill No:</b> <span style={{ color: "#483d8b" }}>{bill.billId}</span>
          </div>
          <div style={{ fontSize: ".995rem", color: "#606060", wordBreak: "break-all" }}>
            <b>Work ID:</b> <span style={{ color: "#222" }}>{bill.workId}</span>
          </div>
          <div style={{ fontSize: ".995rem", color: "#606060", wordBreak: "break-all" }}>
            <b>Work Name:</b> <span style={{ color: "#455a64" }}>{bill.workName}</span>
          </div>
          <div style={{ fontSize: ".995rem", color: "#606060" }}>
            <b>Date:</b> <span style={{ color: "#333" }}>{bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : ""}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", minWidth: 0 }}>
          <div style={{ fontSize: ".97rem", color: "#606060", wordBreak: 'break-word' }}>
            <b>Contractor:</b><br />
            <span style={{ color: "#4578ce", fontWeight: 500 }}>{bill.contractorName}</span>
          </div>
          <div style={{ fontSize: ".97rem", color: "#666" }}>
            <b>Status:</b> <span>{bill.status}</span>
          </div>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
      <table style={{
        width: "100%",
        minWidth: 500,
        borderCollapse: "collapse",
        marginBottom: "20px",
        background: "#feffff",
        borderRadius: "10px",
        fontSize: ".98rem",
        boxShadow: "0 1px 10px #ececec"
      }}>
        <thead>
          <tr style={{ background: "#e3ecf9", borderBottom: "2.4px solid #a2b1c0" }}>
            <th style={{ padding: "7px 3px", whiteSpace: "nowrap" }}>SR No</th>
            <th>Item Description</th>
            <th>Rate (₹)</th>
            <th>Length</th>
            <th>Width</th>
            <th>Depth</th>
            <th>Qty</th>
            <th>Total Rate (₹)</th>
          </tr>
        </thead>
        <tbody>
          {(bill.items || []).map((it, i) => (
            <tr key={i} style={{ textAlign: "center", background: i % 2 === 0 ? "#fafaff" : "#f3f3f8" }}>
              <td>{it.srNo}</td>
              <td style={{ textAlign: "left", minWidth: "100px", wordBreak: "break-word" }}>{it.itemName || "N/A"}</td>
              <td>{it.rate}</td>
              <td>{it.length}</td>
              <td>{it.width}</td>
              <td>{it.depth}</td>
              <td>{it.quantity}</td>
              <td style={{ fontWeight: 600 }}>{it.totalRate}</td>
            </tr>
          ))}
          {reductions.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={8}
                  style={{
                    background: "#faf1e8",
                    color: "#a05019",
                    fontWeight: 600,
                    textAlign: "left",
                    fontSize: "1.01rem"
                  }}
                >
                  Reductions/Deductions
                </td>
              </tr>
              {reductions.map((r, idx) => (
                <tr key={"r" + r.label} style={{ background: "#faf1e8" }}>
                  <td style={{ fontWeight: 600 }} colSpan={7}>{r.label}</td>
                  <td style={{ fontWeight: 600, color: "#ba1801" }}>- ₹{r.value}</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", marginBottom: "10px", gap: "30px" }}>
        <div>
          <span style={labelCell}>Total Quantity</span>
          <br />
          <span style={valueCell}>{bill.totalQuantity}</span>
        </div>
        <div>
          <span style={labelCell}>Total Amount</span>
          <br />
          <span style={{ ...valueCell, fontSize: "1.1rem", color: "#43a047" }}>₹{bill.totalAmount}</span>
        </div>
      </div>
      {reductions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", marginBottom: 9 }}>
          <div>
            <span style={labelCell}>Net Amount After Deductions</span>
            <br />
            <span style={{ ...valueCell, fontSize: "1.13rem", color: "#176d39" }}>
              ₹{(bill.netAmount != null)
                ? bill.netAmount
                : ((bill.totalAmount || 0) - reductions.reduce((a, r) => a + (r.value || 0), 0))}
            </span>
          </div>
        </div>
      )}
      <div
        style={{
          fontSize: ".93rem",
          color: "#858585",
          borderTop: "1.1px dashed #bbb",
          paddingTop: "8px",
          textAlign: "center",
          fontStyle: "italic"
        }}
      >
        This is a system-generated E-Bill. <br />
        <span style={{ color: "#d75c11", fontWeight: 600, fontSize: ".98rem", marginLeft: "5px" }}>
          Powered by CivicWorks
        </span>
      </div>
    </div>
  );
}