import QRCode from "qrcode";

interface LabelAddress {
  name: string;
  street: string;
  suite?: string;
  city: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface ShipmentLabelData {
  trackingNumber: string;
  sender: LabelAddress;
  recipient: LabelAddress;
  carrier?: string;
  serviceLevel?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const formatAddress = (address: LabelAddress) =>
  [
    address.name,
    `${address.street}${address.suite ? `, ${address.suite}` : ""}`,
    `${address.city}${address.state ? `, ${address.state}` : ""}${address.zip ? ` ${address.zip}` : ""}`,
    address.country || "",
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br>");

export const printShipmentLabel = async (shipment: ShipmentLabelData) => {
  const printWindow = window.open("", "_blank", "width=440,height=700");
  if (!printWindow) throw new Error("Allow pop-ups to print the shipment label.");

  try {
    const qrCode = await QRCode.toDataURL(shipment.trackingNumber, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
    });

    printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>JB &amp; Best Logistics Label</title>
        <style>
          body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
          .label { width: 100%; max-width: 360px; margin: 18px auto; background: white; border: 2px solid #0f172a; border-radius: 16px; padding: 18px 16px; box-sizing: border-box; }
          .header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          .brand { font-size: 14px; font-weight: 700; letter-spacing: 0.06em; }
          .tracking { font-size: 12px; font-weight: 700; color: #334155; overflow-wrap: anywhere; text-align: right; }
          .qr-box { display: flex; justify-content: center; margin: 12px 0 18px; }
          .qr-box img { width: 164px; height: 164px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; padding: 8px; }
          .section { margin-bottom: 12px; }
          .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
          .address { font-size: 12px; line-height: 1.5; }
          .meta { font-size: 11px; color: #1e293b; font-weight: 600; }
          @media print { body { background: white; } .label { margin: 0; box-shadow: none; border-width: 1.5px; } }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="brand">JB &amp; BEST</div>
            <div class="tracking">${escapeHtml(shipment.trackingNumber)}</div>
          </div>
          <div class="qr-box"><img src="${qrCode}" alt="Tracking QR code" /></div>
          <div class="section">
            <div class="section-label">From</div>
            <div class="address">${formatAddress(shipment.sender)}</div>
          </div>
          <div class="section">
            <div class="section-label">To</div>
            <div class="address">${formatAddress(shipment.recipient)}</div>
          </div>
          <div class="meta">Carrier: ${escapeHtml((shipment.carrier || "JB Freight").toUpperCase())} · Service: ${escapeHtml(shipment.serviceLevel || "Standard")}</div>
        </div>
        <script>window.onload=()=>window.print()</script>
      </body>
    </html>
    `);
    printWindow.document.close();
  } catch (printError) {
    printWindow.close();
    throw printError;
  }
};