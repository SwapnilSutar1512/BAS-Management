import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/Dashboard.css";

// Decodes username from JWT, fallback to "Unknown User"
function decodeJwtUsername(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.username || parsed.sub || "Unknown User";
  } catch (e) {
    return "Unknown User";
  }
}

export default function ContractorDashboard() {
  const [inputWorkId, setInputWorkId] = useState("");
  const [fetchingBill, setFetchingBill] = useState(false);
  const [decodedUsername, setDecodedUsername] = useState("Unknown User");
  const [ebillData, setEbillData] = useState(null);
  const [billError, setBillError] = useState("");

  const { logout } = useAuth();
  const navigate = useNavigate();

  // Set username from JWT
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jwt");
      const username = token ? decodeJwtUsername(token) : "Unknown User";
      setDecodedUsername(username);
      // eslint-disable-next-line
      console.log("Decoded Username for Contractor:", username);
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Only use the explicit user-input workid for the search
  const handleProceed = async (e) => {
    e.preventDefault();
    setBillError("");
    setEbillData(null);
    if (!inputWorkId.trim()) {
      setBillError("Please enter a Work ID.");
      return;
    }

    setFetchingBill(true);
    try {
      const token = localStorage.getItem("jwt");
      const workIdEncoded = encodeURIComponent(inputWorkId.trim());

      // Call GET API: http://localhost:8085/account/ebills/{workId}
      const response = await fetch(
        `http://localhost:8085/account/ebills/${workIdEncoded}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Access denied: You are not authorized to view this bill. (403 Forbidden)");
        }
        throw new Error("Could not fetch E-Bill for this Work ID");
      }
      const bill = await response.json();

      // Fix for backend compatibility, set totalReduction and netAmount if present by other names
      // If your backend uses other field names than totalReduction/netAmount, map them here
      // But as you specified your backend field names are totalReduction and netAmount, 
      // double-check they're not coming in as string 'null'
      setEbillData({
        ...bill,
        totalReduction:
          bill.totalReduction !== undefined && bill.totalReduction !== null
            ? bill.totalReduction
            : bill.totalDeduction !== undefined
            ? bill.totalDeduction
            : null,
        netAmount:
          bill.netAmount !== undefined && bill.netAmount !== null
            ? bill.netAmount
            : bill.net_Amount !== undefined
            ? bill.net_Amount
            : null,
      });
    } catch (err) {
      setBillError(err?.message || "Error fetching E-Bill");
      setEbillData(null);
    }
    setFetchingBill(false);
  };

  // Utility to format currency for display
  function formatCurrency(n) {
    if (n === null || n === undefined || n === "null" || n === "undefined" || isNaN(Number(n))) return "-";
    return Number(n).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Contractor Dashboard</h1>
        <span
          style={{
            display: "block",
            fontWeight: 500,
            marginTop: 6,
            color: "#324892",
            fontSize: "1.01em",
          }}
        >
          Welcome, {decodedUsername}
        </span>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="view-section">
        <h2>Work Bill Form</h2>
        <p className="info-text">
          Enter your Work ID below to proceed to your bill.
        </p>
        <form
          style={{
            marginTop: 24,
            marginBottom: 32,
            background: "#f8fafd",
            padding: "22px 20px 18px 17px",
            borderRadius: "9px",
            boxShadow: "0 2.5px 9px #e3ecfc8a",
            maxWidth: 410,
          }}
          onSubmit={handleProceed}
        >
          <label
            htmlFor="workid-input"
            style={{
              fontWeight: 600,
              fontSize: "1.05rem",
              color: "#1c3977",
              display: "block",
              marginBottom: 8,
            }}
          >
            Work ID
          </label>
          <input
            id="workid-input"
            type="text"
            value={inputWorkId}
            disabled={fetchingBill}
            style={{
              padding: "8px 11px",
              borderRadius: 6,
              border: "1.05px solid #b9c9fc",
              background: "#fcfdff",
              fontSize: "1.08em",
              width: "100%",
              marginBottom: 15,
            }}
            onChange={(e) => setInputWorkId(e.target.value)}
            placeholder="Enter Work ID"
            required
            autoFocus
          />

          <button
            type="submit"
            disabled={!inputWorkId.trim() || fetchingBill}
            style={{
              padding: "9px 22px",
              background:
                inputWorkId.trim() && !fetchingBill
                  ? "#3169c3"
                  : "#aec6e6",
              color:
                inputWorkId.trim() && !fetchingBill
                  ? "#fff"
                  : "#737a8e",
              fontWeight: 600,
              borderRadius: "6px",
              fontSize: "1.09em",
              border: "none",
              cursor:
                inputWorkId.trim() && !fetchingBill
                  ? "pointer"
                  : "not-allowed",
              transition: "background .1s",
              width: "100%",
            }}
          >
            {fetchingBill ? "Loading E-Bill..." : "Proceed to Bill"}
          </button>
        </form>

        {/* Bill fetch error */}
        {billError && (
          <div
            style={{
              color: "#d32f2f",
              background: "#fff4f4",
              border: "1px solid #e2b2b2",
              borderRadius: "7px",
              padding: "13px",
              marginBottom: 18,
              maxWidth: 420,
              fontWeight: 500,
              fontSize: "1.08em",
            }}
          >
            {billError}
          </div>
        )}

        {/* If ebill is successfully fetched, show bill details */}
        {ebillData && (
          <div
            style={{
              margin: "0 auto 32px auto",
              padding: "21px 18px 12px 18px",
              borderRadius: "10px",
              boxShadow: "0 2.5px 13px #acc1f3bb",
              background: "#fff",
              maxWidth: 520,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <span style={{ color: "#234486", fontWeight: 700, fontSize: "1.17em" }}>Work Bill Details</span>
            </div>
            {/* General Info */}
            <div style={{ marginBottom: 10 }}>
              <div>
                <b>Work ID:</b> {ebillData.workId}&nbsp;&nbsp;|&nbsp;
                <b>Work Name:</b> {ebillData.workName}
              </div>
              <div>
                <b>Contractor:</b> {ebillData.contractorName}
              </div>
              <div>
                <b>Status:</b> <span style={{ color: ebillData.status === "APPROVED" ? "#218833" : "#e12f2f", fontWeight: 600 }}>
                  {ebillData.status}
                </span>
              </div>
              <div>
                <b>Bill Date:</b> {ebillData.createdAt ? new Date(ebillData.createdAt).toLocaleDateString() : "-"}
              </div>
            </div>
            <div style={{ marginTop: 10, marginBottom: 8 }}>
              <b>Items:</b>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse", fontSize: "1.01em" }}>
                  <thead>
                    <tr style={{ background: "#e3eefd" }}>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>#</th>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>Item</th>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>Qty</th>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>Rate</th>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>Total</th>
                      <th style={{ border: "1px solid #c4d6f8", padding: "7px 6px" }}>L x W x D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ebillData.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px", textAlign: "center" }}>{item.srNo}</td>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px" }}>{item.itemName}</td>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px", textAlign: "right" }}>{item.quantity}</td>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px", textAlign: "right" }}>{formatCurrency(item.rate)}</td>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px", textAlign: "right" }}>{formatCurrency(item.totalRate)}</td>
                        <td style={{ border: "1px solid #deeafd", padding: "6px 7px", textAlign: "center" }}>
                          {item.length} x {item.width} x {item.depth}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amount Summary */}
            <div style={{ marginTop: 10 }}>
              <div><b>Total Quantity:</b> {ebillData.totalQuantity}</div>
              <div><b>Total Amount:</b> {formatCurrency(ebillData.totalAmount)}</div>
              <div><b>CGST:</b> {formatCurrency(ebillData.cgst)} &nbsp; | &nbsp;
                <b>SGST:</b> {formatCurrency(ebillData.sgst)}</div>
              <div>
                <b>Royalty:</b> {formatCurrency(ebillData.royalty)} 
              </div>
              <div>
                <b>Total Deductions:</b>{" "}
                {ebillData.reductionIsApplied
                  ? formatCurrency(
                      ebillData.totalReduction !== undefined && ebillData.totalReduction !== null
                        ? ebillData.totalReduction
                        : ebillData.totalDeduction !== undefined
                        ? ebillData.totalDeduction
                        : null
                    )
                  : "None"}
              </div>
              <div>
                <b>Net Amount:</b>{" "}
                <span style={{ color: "#28681d", fontWeight: 700 }}>
                  {formatCurrency(
                    ebillData.netAmount !== undefined && ebillData.netAmount !== null
                      ? ebillData.netAmount
                      : ebillData.net_Amount !== undefined
                      ? ebillData.net_Amount
                      : null
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
