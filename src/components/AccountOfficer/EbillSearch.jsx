import { useState } from "react";

export default function EbillSearch() {
  const [workId, setWorkId] = useState("");
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Placeholder handler for adding reductions (to be implemented as needed)
  const handleAddReduction = () => {
    alert("Add reduction functionality coming soon!");
  };

  const fetchEbill = async () => {
    if (!workId.trim()) {
      setError("Please enter Work ID.");
      return;
    }

    setLoading(true);
    setError("");
    setBill(null);

    try {
      const token = localStorage.getItem("jwt");

      const res = await fetch(
        `http://localhost:8085/account/ebill/${workId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Bill not found");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setBill(data);
    } catch (e) {
      setError("Server error or connection failed.");
    }

    setLoading(false);
  };

  // Styles for realistic e-bill look (simple simulated paper look)
  const billPaperStyle = {
    margin: "30px auto 0 auto",
    maxWidth: "650px",
    boxShadow: "0 0 24px #ececec",
    padding: "40px 45px 30px 45px",
    borderRadius: "14px",
    background:
      "repeating-linear-gradient(0deg, #fafafa, #fafafa 34px, #f0f0f0 36px, #fafafa 36px)"
  };

  const titleStyle = {
    fontFamily: "serif",
    fontWeight: "bold",
    fontSize: "2rem",
    marginTop: 0,
    marginBottom: "12px",
    letterSpacing: "2px",
    color: "#333",
    textAlign: "center"
  };

  const headerBox = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px"
  };

  const labelCell = {
    color: "#888",
    fontSize: "0.97rem"
  };

  const valueCell = {
    fontWeight: 600,
    color: "#1a237e"
  };

  return (
    <div style={{ padding: "20px", background: "#f9f9f9", minHeight: "100vh" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{marginTop:0, textAlign: "center"}}>🔎 Search E-Bill</h2>

        {/* Input Box */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <input
            type="text"
            placeholder="Enter Work ID (e.g., W001)"
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            style={{
              padding: "12px",
              width: "260px",
              borderRadius: "6px",
              border: "1px solid #bdbdbd",
              fontSize: "1rem"
            }}
          />
          <button
            onClick={fetchEbill}
            style={{
              marginLeft: "12px",
              padding: "12px 22px",
              background: "#1976D2",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "1rem",
              letterSpacing: "1px",
              boxShadow: "0 1px 2px #ddd"
            }}
          >
            Search
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", marginTop: "30px" }}>
            <span style={{ fontSize: "1.06rem" }}>Loading E-Bill...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: "red", background: "#ffe6e6", 
            padding: "10px", borderRadius: "6px", 
            maxWidth: "400px", margin: "18px auto", textAlign: "center"}}>
            {error}
          </div>
        )}

        {/* Show Bill */}
        {bill && (
          <div style={billPaperStyle}>
            <div style={{ borderBottom: "2.5px dashed #8594aa", marginBottom: "18px" }}>
              <div style={headerBox}>
                <div>
                  <img
                    src="/bill_stamp.png"
                    alt="bill stamp"
                    style={{ width: "68px", opacity: 0.8 }}
                    onError={e => e.target.style.display='none'}
                  />
                </div>
                <div>
                  <span style={{ color: "#7e3688", fontWeight: 700, letterSpacing: ".8px", fontSize: "1.01rem"}}>
                    MUNICIPAL CORPORATION
                  </span>
                  <br/>
                  <span style={{ fontSize: ".96rem", color: "#555" }}>E-Bill (Works)</span>
                </div>
                <div>
                  <button
                    style={{
                      background: "#f7b801",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: ".96rem",
                      letterSpacing: ".7px",
                      padding: "9px 20px",
                      cursor: "pointer",
                      boxShadow: "0 1px 4px #eee"
                    }}
                    onClick={handleAddReduction}
                    title="Add deduction/reduction"
                  >
                    + Add Reduction
                  </button>
                </div>
              </div>
            </div>

            <div style={{display: "flex", justifyContent: "space-between", marginBottom: "22px"}}>
              <div>
                <div style={{ fontSize: "1.07rem", color: "#5c5c5c", marginBottom: "2px"}}>
                  <b>Bill No:</b> <span style={{ color: "#483d8b" }}>{bill.billId}</span>
                </div>
                <div style={{ fontSize: ".995rem", color: "#606060" }}>
                  <b>Work ID:</b> <span style={{ color: "#222" }}>{bill.workId}</span>
                </div>
                <div style={{ fontSize: ".995rem", color: "#606060" }}>
                  <b>Work Name:</b> <span style={{ color: "#455a64" }}>{bill.workName}</span>
                </div>
                <div style={{ fontSize: ".995rem", color: "#606060" }}>
                  <b>Date:</b> <span style={{ color: "#333" }}>{new Date(bill.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize: ".97rem", color: "#606060" }}>
                  <b>Contractor:</b><br/>
                  <span style={{ color: "#4578ce", fontWeight: 500 }}>{bill.contractorName}</span>
                </div>
                <div style={{ fontSize: ".97rem", color: "#666" }}>
                  <b>Status:</b> <span>{bill.status}</span>
                </div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", background: "#feffff", borderRadius: "10px", fontSize: ".98rem", boxShadow: "0 1px 10px #ececec" }}>
              <thead>
                <tr style={{ background: "#e3ecf9", borderBottom: "2.4px solid #a2b1c0" }}>
                  <th style={{ padding: "7px 3px" }}>SR No</th>
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
                {bill.items.map((it, i) => (
                  <tr key={i} style={{ textAlign: "center", background: i%2===0?"#fafaff":"#f3f3f8" }}>
                    <td>{it.srNo}</td>
                    <td style={{ textAlign: "left", minWidth: "130px" }}>{it.itemName || "N/A"}</td>
                    <td>{it.rate}</td>
                    <td>{it.length}</td>
                    <td>{it.width}</td>
                    <td>{it.depth}</td>
                    <td>{it.quantity}</td>
                    <td style={{ fontWeight: 600 }}>{it.totalRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom: "20px", gap:"40px" }}>
              <div>
                <span style={labelCell}>Total Quantity</span>
                <br/>
                <span style={valueCell}>{bill.totalQuantity}</span>
              </div>
              <div>
                <span style={labelCell}>Total Amount</span>
                <br/>
                <span style={{ ...valueCell, fontSize: "1.25rem", color: "#43a047" }}>₹{bill.totalAmount}</span>
              </div>
            </div>
            <div
              style={{
                fontSize: ".93rem",
                color: "#858585",
                borderTop: "1.1px dashed #bbb",
                paddingTop: "14px",
                textAlign: "center",
                fontStyle: "italic"
              }}
            >
              This is a system-generated E-Bill. For queries, please contact the Accounts Office. <br/>
              <span style={{ color: "#d75c11", fontWeight: 600, fontSize: ".98rem", marginLeft: "5px" }}>
                Powered by CivicWorks
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
